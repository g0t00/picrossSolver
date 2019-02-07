import * as React from 'react';
import {SolutionField, Picross} from '../classes/Picross';
interface IGuessCoordinate {
  col: number;
  row: number;
}
export interface PicrossViewerState {
  solution: SolutionField[];
  calculatingRow: number;
  calculatingCol: number;
  guessCoordinates: IGuessCoordinate[];
}
export interface PicrossViewerProps {
  sharedBuffer: SharedArrayBuffer;
  rowsHints: number[][];
  colsHints: number[][];
  size: number;
}

export class PicrossViewer extends React.Component<PicrossViewerProps, PicrossViewerState> {
  constructor(props: any) {
    super(props);
    this.state = {
      solution: [],
      calculatingRow: -1,
      calculatingCol: -1,
      guessCoordinates: []
    };
    // this.props.picross.emitter.on('partial', solution => {
    //   this.setState({solution});
    // });
    // this.props.picross.emitter.on('calculating', ({row, col}) => {
    //   // console.log({row, col}, 'calculating');
    //   this.setState({row, col});
    // });
    // this.props.picross.emitter.on('guess', ({guess}) => {
    //   this.setState({guess});
    // });
  }
  private animationFrame: number;
  componentDidMount() {
    this.animationFrame = requestAnimationFrame(() => {
      this.createSolution();
    });
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.animationFrame);
  }
  createSolution() {
    try {
      const solution = [];
      let {
        solution: solutionBuffer,
        calculatingRow: calculatingRowBuffer,
        calculatingCol: calculatingColBuffer,
        guessCoordinates: guessCoordinatesBuffer
      } = Picross.generateArrays(this.props.sharedBuffer, this.props.size);
      for (let i = 0; i < solutionBuffer.length; i++) {
        solution.push(solutionBuffer[i]);
      }
      let i = 0;
      const guessCoordinates: IGuessCoordinate[] = [];
      while (guessCoordinatesBuffer[i] !== -1) {
        guessCoordinates.push({
          row: guessCoordinatesBuffer[i],
          col: guessCoordinatesBuffer[i + 1]
        });
        i += 2;
      }
      this.setState({
        solution,
        calculatingRow: calculatingRowBuffer[0],
        calculatingCol: calculatingColBuffer[0],
        guessCoordinates
      });
    } catch (e) {
      console.error(e);
    }
    this.animationFrame = requestAnimationFrame(() => {
      this.createSolution();
    });
  }
  renderRowHeader() {
    const headerRows = [<div className='header-col header-col-spacer'></div>];
    headerRows.push(... this.props.colsHints.map((colHints, index) => {
      let className = 'header-col';
      if (this.state.calculatingCol === index) {
        className += ' header-col-calculating';
      }
      return (
        <div className={className} key={index}>
        {colHints.map((colHint, colHintIndex) => <div className='header-col-hint' key={colHintIndex}>{colHint}</div>)}
        </div>
      );
    }));
    return <div className='row'>{headerRows}</div>;
  }
  renderRows() {
    const rows = [];
    for (let rowIndex = 0; rowIndex < this.props.size; rowIndex++) {
      const rowHints = this.props.rowsHints[rowIndex];
      let className = 'header-row';
      if (this.state.calculatingRow === rowIndex) {
        className += ' header-row-calculating';
      }
      const row = [<div className={className}>
          {
            rowHints.map((rowHint, index) => {
              let className = 'header-row-hint';
              return <div className = {className} key={index}>{rowHint}</div>;
            })
          }
          </div>];
      for (let col = 0; col < this.props.size; col++) {
        const solutionField = this.state.solution[rowIndex * this.props.colsHints.length + col];
        let className = 'field';
        if (solutionField === SolutionField.Yes) {
          className += ' field-yes';
          if (this.state.guessCoordinates.find(guess => guess.col === col && guess.row === rowIndex)) {
            className += ' field-yes-guess';
          }
        } else if (solutionField === SolutionField.No) {
          className += ' field-no';
          if (this.state.guessCoordinates.find(guess => guess.col === col && guess.row === rowIndex)) {
            className += ' field-no-guess';
          }
        }
        row.push(<div className={className} key={col}></div>);

      }
      rows.push(<div className='row' key={rowIndex}>{row}</div>);
    }

    return rows;
  }
  render() {
    try {
      return (<div className='picross-viewer'>
      {this.renderRowHeader()}
      {this.renderRows()}
      </div>);
    } catch (e) {
      return <div>Yolo{JSON.stringify(e)}</div>;
    }
  }
}
