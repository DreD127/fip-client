import _ from "lodash";
import Bacon from "baconjs";

export function getPrint(SongController, token) {
  return !token ? Bacon.constant(null) :
                  SongController.getSpotifyPrint(token).toProperty();
}

export function getSyncs(SongController, p_print) {
  return p_print
    .flatMapLatest(print => SongController.getSyncs(print))
    .toProperty();
}

export function getFavSongs(SongController, p_syncs, favBus) {
  return p_syncs
    .flatMapLatest(syncs => {
      const stream = SongController.getFavSongsStream(syncs, favBus);
      return stream.toEventStream();
    })
    .toProperty();
}

export function getRadioState(SongController, p_favSongs, p_radioSongs) {
  const p_songs = Bacon.combineWith(
    SongController.mergeFavsAndSongs,
    p_radioSongs,
    p_favSongs
  );

  const p_pastSongs = p_songs.map(_.tail);

  const p_nowPlaying = p_songs
    .map(songs => _.isEmpty(songs) ? {type: "loading"} : _.head(songs))
    .flatMapError(data => {
      const code = data && data.error && data.error.code;

      return Bacon.once(code === 100 ? {
        type: "unknown"
      } : new Bacon.Error(data.error));
    })
    .toProperty();

  return {
    nowPlaying: p_nowPlaying,
    pastSongs: p_pastSongs
  };
}

export function saveFavoriteSongs(SongController, p_syncs, p_favSongs) {
  p_syncs.flatMapLatest(syncs => {
    return p_favSongs.flatMapLatest(songs => {
      return SongController.setFavoriteSongs(syncs, songs);
    });
  }).onValue();
}

export function getState(SongController, favBus, token) {
  const p_print = getPrint(SongController, token);
  const p_user = p_print.map(print => print && print.user);
  const p_syncs = getSyncs(SongController, p_print);
  const p_favSongs = getFavSongs(SongController, p_syncs, favBus);

  const songLists = SongController.getFipSongLists();
  const radioStates = _.mapValues(songLists, p_radioSongs => {
    return getRadioState(SongController, p_favSongs, p_radioSongs);
  });

  saveFavoriteSongs(SongController, p_syncs, p_favSongs);

  return Bacon.combineTemplate({
    user: p_user,
    favSongs: p_favSongs,
    radios: radioStates
  });
}

export default (SongController) => ({
  getState: _.partial(getState, SongController)
})