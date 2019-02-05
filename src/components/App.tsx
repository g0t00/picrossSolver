import * as React from 'react';
import {PicrossViewer} from './PicrossViewer';
import {Picross} from '../classes/Picross';
import {PicrossGenerator} from '../classes/PicrossGenerator';
import {webpbn} from '../classes/Webpbn';
export interface AppProps {
}
export interface AppState {
  picross: Picross;
  solutionFields: boolean[][];
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
    this.generateAndSolve();
    // this.state = {
    //   picross,
    //   solutionFields: this.picrossGenerator.fields
    // };
  }
  async generateAndSolve() {
      const {rowHints, colHints} = await webpbn.getFromDb(true);
      // this.picrossGenerator.generate();
      // const rowHints = this.picrossGenerator.rowsHints;
      // const colHints = this.picrossGenerator.colsHints;
      const picross = new Picross(rowHints, colHints);
      picross.solve();
      picross.emitter.on('done', () => {
        window.setTimeout(() => {
          this.generateAndSolve();
        }, 2000);
      });
      this.setState({
        picross,
        solutionFields: this.picrossGenerator.fields
      });
  }
    render() {
      // { this.state.solutionFields.map(row => {
      //   return <div className='solution-row'>{row.map(field => {
      //     const className = field ? 'solution-yes' : 'solution-no';
      //     return <div className={className}> </div>;
      //   })}</div>;
      // })}
      if (this.state && this.state.picross) {
        return (
          <div className='app'>
          <br/>


          <PicrossViewer picross={this.state.picross} label='solved'/>
          <button onClick = {() => this.generateAndSolve()}>New</button>
          </div>
        );
      }
      return null;
    }
}
