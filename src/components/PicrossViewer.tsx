import * as React from 'react';
import {Picross, SolutionField, Solution, IGuessWithoutSolutionBefore} from '../classes/Picross';
export interface PicrossViewerState {
  solution: Solution;
  row: number;
  col: number;
  guess: IGuessWithoutSolutionBefore[];
}
export interface PicrossViewerProps {
  picross: Picross;
  label: string;
}

export class PicrossViewer extends React.Component<PicrossViewerProps, PicrossViewerState> {
  constructor(props: any) {
    super(props);
    this.state = {
      solution: this.props.picross.solution,
      row: -1,
      col: -1,
      guess: []
    };
    this.props.picross.emitter.on('partial', solution => {
      this.setState({solution});
    });
    this.props.picross.emitter.on('calculating', ({row, col}) => {
      // console.log({row, col}, 'calculating');
      this.setState({row, col});
    });
    this.props.picross.emitter.on('guess', ({guess}) => {
      this.setState({guess});
    });
  }
  componentDidUpdate (prevProps: PicrossViewerProps) {
    if (this.props.picross !== prevProps.picross) {
      this.setState({guess: []});
      this.props.picross.emitter.on('partial', solution => {
        this.setState({solution});
      });
      this.props.picross.emitter.on('calculating', ({row, col}) => {
        // console.log({row, col}, 'calculating');
        this.setState({row, col});
      });
      this.props.picross.emitter.on('guess', ({guess}) => {
        this.setState({guess});
      });
    }
  }
  renderRowHeader() {
    const headerRows = [<div className='header-col header-col-spacer'>{this.props.label}</div>];
    headerRows.push(... this.props.picross.colsHints.map((colHints, index) => {
      let className = 'header-col';
      if (this.state.col === index) {
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
    for (let rowIndex = 0; rowIndex < this.props.picross.rowsHints.length; rowIndex++) {
      const rowHints = this.props.picross.rowsHints[rowIndex];
      let className = 'header-row';
      if (this.state.row === rowIndex) {
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
      let col = -1;
      for (const solutionField of this.state.solution[rowIndex]) {
        col++;
        let className = 'field';
        if (solutionField === SolutionField.Yes) {
          className += ' field-yes';
          if (this.state.guess.find(guess => guess.coordinates.col === col && guess.coordinates.row === rowIndex && guess.guessSolution)) {
            className += ' field-yes-guess';
          }
        } else if (solutionField === SolutionField.No) {
          className += ' field-no';
          if (this.state.guess.find(guess => guess.coordinates.col === col && guess.coordinates.row === rowIndex && guess.guessSolution === false)) {
            className += ' field-no-guess';
          }
        }
        row.push(<div className={className}></div>);

      }
      rows.push(<div className='row'>{row}</div>);
    }

    return rows;
  }
  render() {
    return (<div className='picross-viewer'>
    {this.renderRowHeader()}
    {this.renderRows()}
    {JSON.stringify(this.state.guess)}
    </div>);
  }
}
