import _ from "lodash";
import Bacon from "baconjs";

export function getCurrentRadio(p_route) {
  return p_route.map(".params.radio").skipDuplicates();
}

export function getBroadcastedSong(p_route, p_radios) {
  const p_radio = getCurrentRadio(p_route);

  const p_song = Bacon.combineWith(p_radio, p_radios, (radio, radios) => {
    return radios[radio].nowPlaying;
  });

  return p_song.skipDuplicates(_.isEqual);
}

export function getSongHistory(p_route, p_radios) {
  const p_radio = getCurrentRadio(p_route);

  const p_history = Bacon.combineWith(p_radio, p_radios, (radio, radios) => {
    return radios[radio].pastSongs.map(item => item.song);
  });

  return p_history.skipDuplicates(_.isEqual);
}

export function getSongBeingPlayed(p_radios, p_playBus) {
  const p_cmds = p_playBus.filter(cmd => cmd.type != "stop");

  const p_song = Bacon.combineWith(p_radios, p_cmds, function(radios, cmd) {
    switch(cmd.type) {
      case "loading":
      case "spotify":
        return cmd;
      case "radio":
        return radios[cmd.radio].nowPlaying;
      default:
        return new Bacon.Error();
    }
  });

  return p_song.skipDuplicates(_.isEqual);
}

export function getPlayingStatus(s_playBus) {
  return s_playBus.map(cmd => cmd.type != "stop" && cmd.type != "spotify")
    .skipDuplicates()
    .toProperty(false);
}

export default (p_route) => ({
  getCurrentRadio: _.partial(getCurrentRadio, p_route),
  getBroadcastedSong: _.partial(getBroadcastedSong, p_route),
  getSongHistory: _.partial(getSongHistory, p_route),
  getSongBeingPlayed: getSongBeingPlayed,
  getPlayingStatus: getPlayingStatus
})
