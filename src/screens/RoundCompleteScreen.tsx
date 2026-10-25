import type { SwipeAnswersFile } from '../types'
import { exportAnswers } from '../export'
export default function RoundCompleteScreen({file,newRound,onNew,onSwitch,onUndo}: {file: SwipeAnswersFile; newRound: boolean; onNew: () => void; onSwitch: () => void; onUndo: () => void}) {
 return <main className="center-screen screen"><span className="house-mark">⌂</span><p className="eyebrow">A LITTLE CLOSER TO HOME</p><h1>All done!</h1><p>Mark is putting together the next round. We’ll have it here soon.</p>{newRound && <button className="primary" onClick={onNew}>A new round is ready!</button>}<a className="button" href="#/loved">Your loved pictures ♥</a><button onClick={() => void exportAnswers(file)}>Share your answers</button><button className="text-button" onClick={onUndo}>↶ Oops, go back</button><button className="text-button" onClick={onSwitch}>Switch person</button></main>
}
