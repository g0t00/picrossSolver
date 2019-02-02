import {EventEmitter} from 'events';
export class Picross {
  public readonly size: number;
  public emitter = new EventEmitter();
  public solution: SolutionField[][];
  public guess: IGuess[] = [];
  constructor(public rowsHints: IHints, public colsHints: IHints) {
    this.size = Math.max(rowsHints.length, colsHints.length);
    while (rowsHints.length < this.size) {
      rowsHints.push([]);
    }
    while (colsHints.length < this.size) {
      colsHints.push([]);
    }
    this.solution = [];
    for (let x = 0; x < this.size; x++) {
      const row = [];
      for (let y = 0; y < this.size; y++) {
        row.push(SolutionField.Unknown);
      }
      this.solution.push(row);
    }
    this.emitGuess();
  }
  emitGuess() {
    this.emitter.emit('guess', {guess: this.guess.map(({guessSolution, coordinates}) => {
      return JSON.parse(JSON.stringify({guessSolution, coordinates}));
    })});
  }
  async solveRowsOrColls(rows: boolean) {
    const rowOrCollHints = rows ? this.rowsHints : this.colsHints;
    let index = -1;
    for (const hints of rowOrCollHints) {
      index++;
      let filled = true;
      for (let i = 0; i < this.size; i++) {
        let field = rows ? this.solution[index][i] : this.solution[i][index];
        if (field === SolutionField.Unknown) {
          filled = false;
        }
      }
      if (filled) {
        let noGuess = true;
        for (const guess of this.guess) {
          if ((rows && guess.coordinates.row === index) || (!rows && guess.coordinates.col === index)) {
            noGuess = false;
          }
        }
        if (noGuess) {
          continue;
        }
      }
      if (rows) {
        this.emitter.emit('calculating', {row: index, col: -1});
      } else {
        this.emitter.emit('calculating', {row: -1, col: index});
      }
      await this.animationFrame();
      // console.log(`Solving for ${rows ? 'rows' : 'cols'} index: ${index}, hints: ${hints}`);
      const possibleSolutions = this.generateAllSolutionForRow(hints).filter(solution => {
        let possible = true;
        for (let i = 0; i < this.size; i++) {
          let field = rows ? this.solution[index][i] : this.solution[i][index];
          if (field === SolutionField.Unknown) {

          } else if (field !== solution[i]) {
            return false;
          }
        }
        let pointer = 0;
        for (const hint of hints) {
          while (solution[pointer] === SolutionField.No) {
            pointer++;
            if (typeof solution[pointer] === 'undefined') {
              possible = false;
              break;
            }
          }
          if (!possible) {
            break;
          }
          for (let i = 0; i < hint; i++) {
            if (typeof solution[pointer + i] !== 'undefined' && solution[pointer + i] === SolutionField.Yes) {

            } else {
              possible = false;
            }
          }
          pointer += hint;
          if (typeof solution[pointer] !== 'undefined' && solution[pointer] === SolutionField.Yes) {
            possible = false;
          }
          pointer++;
          if (!possible) {
            break;
          }
        }
        while (typeof solution[pointer] !== 'undefined') {
          if (solution[pointer] === SolutionField.Yes) {
            possible = false;
          }
          pointer++;
        }
        return possible;
      });
      if (possibleSolutions.length === 0) {
        throw new Error(`No Possible Solution. Whut? index: ${index}` + JSON.stringify(hints));
      }
      // console.log(possibleSolutions, hints);
      if (possibleSolutions.length === 1) {
        if (rows) {
          for (let i = 0; i < this.size; i++) {
            this.solution[index][i] = possibleSolutions[0][i];
          }
        } else {
          for (let i = 0; i < this.size; i++) {
            this.solution[i][index] = possibleSolutions[0][i];
          }
        }
      } else {
        for (let i = 0; i < this.size; i++) {
          let sameOnAll = true;
          const value = possibleSolutions[0][i];
          for (const possibleSolution of possibleSolutions) {
            if (possibleSolution[i] !== value) {
              sameOnAll = false;
            }
          }
          if (sameOnAll) {
            if (rows) {
              this.solution[index][i] = value;
            } else {
              this.solution[i][index] = value;
            }
          }
        }
      }
      await this.animationFrame();
      this.emitter.emit('partial', this.solution);
    }
  }
  async animationFrame() {
    // return new Promise(resolve => {
    //   requestAnimationFrame(() => {
    //     resolve();
    //   });
    // });
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      });
    });
  }

  verifySolution(): boolean {
    for (let rowI = 0; rowI < this.size; rowI++) {
      let colI = 0;
      const hints = this.rowsHints[rowI];
      for (const hint of hints) {
        while (colI < this.size && this.solution[rowI][colI] === SolutionField.No) {
          colI++;
        }
        if (colI === this.size) {
          return false;
        }
        for (let i = 0; i < hint; i++) {
          if (colI === this.size || this.solution[rowI][colI] !== SolutionField.Yes) {
            return false;
          }
          colI++;
        }
      }
    }
    for (let colI = 0; colI < this.size; colI++) {
      let rowI = 0;
      const hints = this.colsHints[colI];
      for (const hint of hints) {
        while (rowI < this.size && this.solution[rowI][colI] === SolutionField.No) {
          rowI++;
        }
        if (rowI === this.size) {
          return false;
        }
        for (let i = 0; i < hint; i++) {
          if (rowI === this.size || this.solution[rowI][colI] !== SolutionField.Yes) {
            return false;
          }
          rowI++;
        }
      }
    }
    return true;
  }
  async solve(disableRow: boolean = false, disableCol: boolean = false) {
    let counter = 0;
    let solved = false;
    this.guess = [];
    while (!solved) {
      let changed = true;
      let jumpedOutDirect = true;
      try {
        while (changed) {
          changed = false;
          let before = JSON.stringify(this.solution);
          if (!disableRow) {
            await this.solveRowsOrColls(true);
            await this.animationFrame();
            this.emitter.emit('partial', this.solution);
          }
          if (!disableCol) {
            await this.solveRowsOrColls(false);
            await this.animationFrame();
            this.emitter.emit('partial', this.solution);
          }
          changed = before !== JSON.stringify(this.solution);
          if (changed) {
            jumpedOutDirect = false;
          }
          console.log(counter);
        }
      } catch (e) {
        console.log('found irregular, jumping back', e);
        console.log(`guess length: ${this.guess.length} typeof: ${typeof this.guess}`);
        if (this.guess.length === 0) {
          throw new Error('found irregular, no guess');
        }
        if (jumpedOutDirect) {
          let i = this.guess.length - 1;
          while (i--) {
             if (this.guess[i].guessSolution === true) {
              break;
            }
          }
          console.log(i, 'i');
          this.guess[i].guessSolution = false;
          this.solution = this.guess[i].solutionBefore;
          this.solution[this.guess[i].coordinates.row][this.guess[i].coordinates.col] = SolutionField.No;
          if (i > 0) {
            this.guess.splice(i + 1);
          } else {
            this.guess.splice(0);
          }

        } else {
          const guess = this.guess[this.guess.length - 1];
          guess.guessSolution = false;
          this.solution = guess.solutionBefore;
          this.solution[guess.coordinates.row][guess.coordinates.col] = SolutionField.No;
          if (this.guess.length === 1) {
            this.guess.splice(0);
          }
        }
        this.emitter.emit('partial', this.solution);

        this.emitGuess();
      }
      solved = true;
      for (const solutionRow of this.solution) {
        for (const solutionCol of solutionRow) {
          if (solutionCol === SolutionField.Unknown) {
            solved = false;
          }
        }
      }
      // solved = true;
      if (!solved) {
        // guess
        let changedSomething = false;
        let row = -1;
        for (const solutionRow of this.solution)  {
          row++;
          let col = -1;
          for (const solutionCol of solutionRow) {
            col++;
            if (!changedSomething && solutionCol === SolutionField.Unknown) {
              solutionRow[col] = SolutionField.Yes;
              changedSomething = true;
              const guess = {
                guessSolution: true,
                coordinates: {
                  row, col
                },
                solutionBefore: this.solution.map(row => row.map(col => col))
              };
              this.guess.push(guess);
              console.log(guess);
              this.emitGuess();
            }
          }
        }
      } else if (!this.verifySolution()) {
        let i = this.guess.length - 1;
        while (i--) {
           if (this.guess[i].guessSolution === true) {
            break;
          }
        }
        console.log(i, 'i');
        this.guess[i].guessSolution = false;
        this.solution = this.guess[i].solutionBefore;
        this.solution[this.guess[i].coordinates.row][this.guess[i].coordinates.col] = SolutionField.No;
        if (i > 0) {
          this.guess.splice(i + 1);
        } else {
          this.guess.splice(0);
        }
        this.emitGuess();
      }

      this.emitter.emit('partial', this.solution);
      counter++;
    }
    if (!this.verifySolution()) {
      throw new Error('Wrong Solution');
    }
    this.emitter.emit('done');
    // console.log(this);
  }

  generateAllSolutionForRow(hints: number[]) {
    const totalSpace = this.size - hints.reduce((prev, curr) => prev + curr, 0);
    let spacings: number[][] = [];
    for (let spacingIndex = 0; spacingIndex <= hints.length; spacingIndex++) {
      if (spacingIndex === 0) {
        for (let space = 0; space <= totalSpace; space++) {
          spacings.push([space]);
        }
      } else  {
        const spacingsNew = [];
        for (const spacing of spacings) {
          const usedUpSpace = spacing.reduce((prev, curr) => prev + curr, 0);
          for (let space = (spacingIndex === 0 || spacingIndex === hints.length ? 0 : 1); space <= (totalSpace - usedUpSpace); space++) {
            spacingsNew.push([...spacing, space]);
          }
        }
        spacings = spacingsNew;
      }
    }
    spacings = spacings.filter(spacing => {
      return spacing.reduce((prev, curr) => prev + curr, 0) === totalSpace;
    });
    return spacings.map(spacing => {
      const solution = [];
      spacing.forEach((space, spaceIndex) => {
        for (let i = 0; i < space; i++) {
          solution.push(SolutionField.No);
        }
        if (typeof hints[spaceIndex] !== 'undefined') {
          for (let i = 0; i < hints[spaceIndex]; i++) {
            solution.push(SolutionField.Yes);
          }
        }
      });
      // console.log(solution, hints);
      return solution;
    });
  }
}
export enum SolutionField {
  No,
  Yes,
  Unknown
}
export type Solution = SolutionField[][];
export interface ICoordinate {
  col: number;
  row: number;
}
export interface IGuess {
  guessSolution: boolean;
  coordinates: ICoordinate;
  solutionBefore: Solution;
}
export interface IGuessWithoutSolutionBefore {
  guessSolution: boolean;
  coordinates: ICoordinate;
}
export type IHints = number[][];
