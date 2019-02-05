import * as React from 'react';
import {PicrossViewer} from './PicrossViewer';
import {PicrossGenerator} from '../classes/PicrossGenerator';
import {Picross} from '../classes/Picross';
import {webpbn} from '../classes/Webpbn';
import PicrossWorker = require('worker-loader!../classes/PicrossWorker');
// import {IPicrossState} from '../classes/Picross';
export interface AppProps {
}
export interface AppState {
  sharedBuffer: SharedArrayBuffer;
  solutionFields: boolean[][];
  rowsHints: number[][];
  colsHints: number[][];
  size: number;
}

export default class App extends React.Component<AppProps, AppState> {
  picrossGenerator: PicrossGenerator = new PicrossGenerator(15);
  constructor(props: AppProps) {
    super(props);
    // const {rowHints, colHints} = webpbn.getRandom();
    // // const [rowHints, colHints] = webpbn.getFromText();
    // // console.log(rowHints, colHints);
    // // const rowHints = [[4, 1], [2, 4], [2, 5], [1, 1, 2], [3, 1], [1, 1, 2], [2, 1, 1], [5, 1], [3, 1, 2], [1, 1, 1, 1]];
    // // const colHints = [[2, 2], [1, 1, 2], [1, 1, 3], [2, 1, 2, 1], [1, 3, 1], [3, 4], [3, 2], [3, 1], [3, 4], [1, 1, 1]];
    // // const rowHints = [[4], [1, 2, 3]];
    // // const colHints = [[1], [1, 1], [1, 2, 2, 3], [1, 2, 1, 4], [2, 2, 4, 2], [1, 1, 1, 4], [2, 3, 2, 1], [4, 6], [1, 1, 2, 1], [1, 1, 1, 1, 1], [2, 1, 2], [1, 3, 3], [1, 2, 2], [3, 2], [4]];
    // // const rowHints = [[4], [3], [3, 2]48, [3, 1], [7], [1, 2, 2], [5, 2, 2], [1, 1], [1, 1, 5], [2, 3, 2], [1, 1, 1], [1, 1, 2, 1], [2, 7, 1], [1, 2, 1, 5], [1, 2, 3, 4]];
    // // const colHints = [[1], [1, 1], [1, 2, 2, 3], [1, 2, 1, 4], [2, 2, 4, 2], [1, 1, 1, 4], [2, 3, 2, 1], [4, 6], [1, 1, 2, 1], [1, 1, 1, 1, 1], [2, 1, 2], [1, 3, 3], [1, 2, 2], [3, 2], [4]];
    // // this.picrossGenerator.generate();
    // // const rowHints = this.picrossGenerator.rowsHints;
    // // const colHints = this.picrossGenerator.colsHints;
    // const picross = new Picross([[1]], [[1]]);
    // picross.solve();
    // picross.emitter.on('done', () => {
    //   window.setTimeout(() => {
    //     this.generateAndSolve();
    //   }, 2000);
    // });
    // this.state = {
    //   picross,
    //   solutionFields: this.picrossGenerator.fields
    // };
  }
  async generateAndSolve() {
      const {rowsHints, colsHints} = await webpbn.getFromDb(true);
      this.setState({
        rowsHints,
        colsHints
      });
      // this.picrossGenerator.generate();
      // const rowHints = this.picrossGenerator.rowsHints;
      // const colHints = this.picrossGenerator.colsHints;
      const picross = new PicrossWorker();
      if (picross === null) {
        throw new Error('BLUB');
      }
      picross.postMessage({type: 'hints', rowsHints, colsHints});
      const size = Math.max(rowsHints.length, colsHints.length);
      this.setState({size});
      console.log('size app', size);

      picross.onmessage = event => {
        console.log(event);
        this.setState({
          sharedBuffer: event.data
        });
        console.log(event);
        // if (event.data.type === 'partial') {
        //   this.setState({
        //     picross: JSON.parse(JSON.stringify(event.data.state))
        //   });
        // } else if (event.data.type === 'calculating') {
        //   this.setState({
        //     row: event.data.row,
        //     col: event.data.col
        //   });
        // } else if (event.data.type === 'done') {
        //   window.setTimeout(() => {
        //     this.generateAndSolve();
        //   }, 2000);
        // }
        // console.log(event.data.state, event.data.type);
        const doneFlag = new Uint8Array(event.data, Uint32Array.BYTES_PER_ELEMENT * 2 + size * size, 1);

        const interval = window.setInterval(() => {
          if (doneFlag[0] === 1) {
            window.clearInterval(interval);
          }
        }, 2000);
      };
      this.setState({
        solutionFields: this.picrossGenerator.fields
      });
      picross.postMessage({type: 'solve'});
  }
  async generateAndSolveSync() {
      const {rowsHints, colsHints} = await webpbn.getFromDb(false);
      // this.picrossGenerator.generate();
      // const rowHints = this.picrossGenerator.rowsHints;
      // const colHints = this.picrossGenerator.colsHints;
      const picross = new Picross(rowsHints, colsHints, data => {
        // if (data.type === 'partial') {
        //   this.setState({
        //     picross: JSON.parse(JSON.stringify(data.state))
        //   });
        // } else if (data.type === 'calculating') {
        //   this.setState({
        //     row: data.row,
        //     col: data.col
        //   });
        // } else if (data.type === 'done') {
        //   window.setTimeout(() => {
        //     this.generateAndSolveSync();
        //   }, 2000);
        // }
        console.log(data.state, data.type);
      });
      this.setState({
        solutionFields: this.picrossGenerator.fields
      });
      await picross.solve();

  }
    async componentDidMount() {
      console.log('componentDidMount');
      await this.generateAndSolve();

    }
    render() {
      if (this.state && this.state.sharedBuffer) {
        return (
          <div className='app'>
          <br/>

          <PicrossViewer sharedBuffer={this.state.sharedBuffer} size = {this.state.size} rowsHints = {this.state.rowsHints} colsHints = {this.state.colsHints} />
          <button onClick = {() => this.generateAndSolve()}>New</button>
          </div>
        );
      }
      return <div>Loading</div>;
    }
}
