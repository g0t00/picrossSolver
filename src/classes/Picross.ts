// import RowColWorker = require('worker-loader!./rowColWorker');
// import {EventEmitter} from 'events';
import * as bluebird from 'bluebird';

// const delay = (time: number) => new Promise(resolve => window.setTimeout(resolve, time));
export class ContradictionError extends Error {
  contradiction = true;
  constructor (m: string) {
    super(m);
    Object.setPrototypeOf(this, ContradictionError.prototype);
  }
}
console.log('hello from picross');
export interface IPicrossState {
  size: number;
  solution: Uint8Array;
  colsHints: IHints;
  rowsHints: IHints;
  guess: IGuess[];
}
export enum SolutionField {
  No,
  Yes,
  Unknown
}
export class Picross {
  public size: number;
  public solution: Uint8Array;
  public doneFlag: Uint8Array;
  public calculatingRow: Uint32Array;
  public calculatingCol: Uint32Array;
  public guessCoordinates: Int8Array;
  private sharedBuffer: SharedArrayBuffer;
  // public solution: SharedArrayBuffer; new SharedArrayBuffer(1024);
  public guess: IGuess[] = [];
  // private workerPool: RowColWorker[] = [];
  private rowCache = new Map<number, SolutionField[]>();
  private colCache = new Map<number, SolutionField[]>();
  static generateArrays(buffer: SharedArrayBuffer, size: number) {
    const calculatingRow = new Uint32Array(buffer, 0, 4);
    const calculatingCol = new Uint32Array(buffer, Uint32Array.BYTES_PER_ELEMENT, 4);
    const guessCoordinates = new Int8Array(buffer, 2 * Uint32Array.BYTES_PER_ELEMENT, 2 * size * size * Int8Array.BYTES_PER_ELEMENT);
    const solution = new Uint8Array(buffer, Uint32Array.BYTES_PER_ELEMENT * 2 + 2 * size * size * Int8Array.BYTES_PER_ELEMENT, size * size);
    const doneFlag = new Uint8Array(buffer, Uint32Array.BYTES_PER_ELEMENT * 2 + 2 * size * size * Int8Array.BYTES_PER_ELEMENT + size * size, 1);
    return {solution, doneFlag, calculatingRow, calculatingCol, guessCoordinates};
  }
  private mostExpensiveRowOrCol = 0;
  getPos(row: number, col: number) {
    return row * this.size + col;
  }
  constructor(public rowsHints: IHints, public colsHints: IHints, public sendMessage: (data: any) => void) {
    this.size = Math.max(this.rowsHints.length, this.colsHints.length);
    console.log('hello from picross constructor', this.size);
    this.sharedBuffer = new SharedArrayBuffer(this.size * this.size + 1 + 2 * Uint32Array.BYTES_PER_ELEMENT + 2 * this.size * this.size * Int8Array.BYTES_PER_ELEMENT);
    this.sendMessage(this.sharedBuffer);
      while (this.rowsHints.length < this.size) {
        this.rowsHints.push([]);
      }
      while (this.colsHints.length < this.size) {
        this.colsHints.push([]);
      }
      ({
        solution: this.solution,
        doneFlag: this.doneFlag,
        calculatingRow: this.calculatingRow,
        calculatingCol: this.calculatingCol,
        guessCoordinates: this.guessCoordinates
      } = Picross.generateArrays(this.sharedBuffer, this.size));
      for (let x = 0; x < this.size; x++) {
        for (let y = 0; y < this.size; y++) {
          this.solution[this.getPos(x, y)] = SolutionField.Unknown;
        }
      }
      for (let i = 0; i < this.guessCoordinates.length; i++) {
        this.guessCoordinates[i] = -1;
      }
      this.emitPartial();
  }
  emit(_: any) {
    // this.sendMessage(obj);
  }
  emitPartial() {
    // const state: IPicrossState = {
    //   size: this.size,
    //   solution: this.solution,
    //   colsHints: this.colsHints,
    //   rowsHints: this.rowsHints,
    //   guess: this.guess
    // };
    // this.emit({
    //   type: 'partial',
    //   state
    // });
    // this.sendMessage(this.sharedBuffer);
  }
  async solveRowsOrColls(rows: boolean, maxCost: number) {
    const rowOrCollHints = rows ? this.rowsHints : this.colsHints;
    await bluebird.map(rowOrCollHints, async (hints, index) => {
      if (rows) {
        this.calculatingCol[0] = -1;
        this.calculatingRow[0] = index;
      } else {
        this.calculatingCol[0] = index;
        this.calculatingRow[0] = -1;
      }
      let cacheSame = true;
      if (rows) {
        const cache = this.rowCache.get(index);
        if (typeof cache === 'undefined') {
          cacheSame = false;
        } else {
          for (let i = 0; i < this.size; i++) {
            if (cache[i] !== this.solution[this.getPos(index, i)]) {
              cacheSame = false;
            }
          }
        }
      } else {
        const cache = this.colCache.get(index);
        if (typeof cache === 'undefined') {
          cacheSame = false;
        } else {
          for (let i = 0; i < this.size; i++) {
            if (cache[i] !== this.solution[this.getPos(i, index)]) {
              cacheSame = false;
            }
          }
        }
      }
      if (!cacheSame) {
        const evaluation = await this.optimizedRowOrCol(rows, hints, index, maxCost);
        if (evaluation !== false) {
          // if (rows) {
          //   this.emitPartial();
          // } else {
          //   this.emitPartial();
          // }
          await this.animationFrame();
          let i = -1;
          for (const field of evaluation) {
            i++;
            if (field !== SolutionField.Unknown) {
              if (rows) {
                this.solution[this.getPos(index, i)] = field;
              } else {
                this.solution[this.getPos(i, index)] = field;
              }
            }
          }
          if (rows) {
            this.rowCache.set(index, evaluation);
          } else {
            this.colCache.set(index, evaluation);
          }
        }
        // this.emitPartial();
      }
    }, {concurrency: 1});
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
  hardCopyArray<Type>(input: Type[]): Type[] {
    const ret: Type[] = [];
    for (const child of input) {
      ret.push(child);
    }
    return ret;
  }
  solveBorder(baseLine: SolutionField[], hints: number[]) {
    let i = 0;
    let changed = false;
    while (baseLine[i] === SolutionField.No) {
      i++;
    }
    if (baseLine[i] === SolutionField.Yes) {
      for (let x = 0; x < hints[0]; x++) {
        if (baseLine[i + x] === SolutionField.No) {
          throw new ContradictionError('asd');
        } else if (baseLine[i + x] === SolutionField.Unknown) {
          baseLine[i + x] = SolutionField.Yes;
          changed = true;
        }
      }
      if (baseLine[i + hints[0]] === SolutionField.Yes) {
        throw new ContradictionError('asd2');
      } else if (baseLine[i + hints[0]] === SolutionField.Unknown) {
        baseLine[i + hints[0]] = SolutionField.No;
        changed = true;
      }
    }
    i = baseLine.length - 1;
    while (baseLine[i] === SolutionField.No) {
      i--;
    }
    if (baseLine[i] === SolutionField.Yes) {
      const lastHint = hints[hints.length - 1];
      for (let x = 0; x < lastHint; x++) {
        if (baseLine[i - x] === SolutionField.No) {
          throw new ContradictionError('asd');
        } else if (baseLine[i - x] === SolutionField.Unknown) {
          baseLine[i - x] = SolutionField.Yes;
          changed = true;
        }
      }
      if (baseLine[i - lastHint] === SolutionField.Yes) {
        throw new ContradictionError('asd2');
      } else if (baseLine[i - lastHint] === SolutionField.Unknown) {
        baseLine[i - lastHint] = SolutionField.No;
        changed = true;
      }
    }
    return {changed, baseLine};
  }
  async optimizedRowOrCol(rows: boolean, hints: number[], index: number, maxCost: number): Promise<false|SolutionField[]> {
    if (hints.length === 0) {
      return Array(this.size).fill(SolutionField.No);
    }
    let baseLine: SolutionField[] = [];
    for (let i = 0; i < this.size; i++) {
      if (rows) {
        baseLine.push(this.solution[this.getPos(index, i)]);
      } else {
        baseLine.push(this.solution[this.getPos(i, index)]);
      }
    }
    let offsetStart = 0;
    let offsetEnd = 0;
    // offsetStartLoop: while (offsetStart < this.size - 1) {
    //   if (baseLine[offsetStart] && baseLine[offsetStart] === SolutionField.No) {
    //     offsetStart++;
    //   } else {
    //     for (let i = 0; i < hints[0]; i++) {
    //       if (baseLine[offsetStart + i] !== SolutionField.Yes) {
    //         break offsetStartLoop;
    //       }
    //     }
    //     if (baseLine[offsetStart + hints[0] + 1] !== SolutionField.No) {
    //       break offsetStartLoop;
    //     }
    //     offsetStart += hints[0];
    //     hints = hints.slice(1);
    //   }
    // }
    // offsetEndLoop: while (offsetEnd < this.size - 1 - offsetStart) {
    //   if (baseLine[baseLine.length - 1 - offsetEnd] === SolutionField.No) {
    //     offsetEnd++;
    //   } else {
    //     for (let i = 0; i < hints[hints.length - 1]; i++) {
    //       if (baseLine[baseLine.length - 1 - offsetEnd - i] !== SolutionField.Yes) {
    //         break offsetEndLoop;
    //       }
    //     }
    //     if (baseLine[baseLine.length - 1 - offsetEnd + hints[hints.length - 1] - 1] !== SolutionField.No) {
    //       break offsetEndLoop;
    //     }
    //     offsetEnd += hints[hints.length - 1];
    //     hints = hints.slice(0, hints.length - 1);
    //   }
    // }
    if (hints.length === 0) {
      for (let i = offsetStart; i < baseLine.length - offsetEnd; i++) {
        baseLine[i] = SolutionField.No;
      }
      return baseLine;
    }
    const startDone = baseLine.slice(0, offsetStart);
    const endDone = baseLine.slice(baseLine.length - offsetEnd);
    baseLine = baseLine.slice(offsetStart, baseLine.length - offsetEnd);
    let sizeWithOffset = this.size - offsetStart - offsetEnd;
    const totalSpace = sizeWithOffset - hints.reduce((prev, curr) => prev + curr, 0);
    const cost = totalSpace * hints.length;

    if (cost > maxCost) {
      if (this.mostExpensiveRowOrCol < cost) {
        this.mostExpensiveRowOrCol = cost;
      }
      const {changed, baseLine: result} = this.solveBorder(baseLine, hints);
      if (changed) {
        return result;
      }
      return false;
    }
    // console.log(totalSpace, hints.length);
    let spacings: number[] = [];
    for (let i = 0; i < hints.length; i++) {
      spacings.push(i === 0 ? 0 : 1);
    }
    let running = true;
    let firstSolution: SolutionField[]|null = null;
    while (running) {
      const solution = Array(sizeWithOffset).fill(SolutionField.No);
      let offset = 0;
      let conflict = false;
      for (const [spaceIndex, space] of spacings.entries()) {
        for (let i = 0; i < space; i++) {
          if (baseLine[offset] === SolutionField.Yes) {
            conflict = true;
          }
          offset += 1;
        }
        for (let i = 0; i < hints[spaceIndex]; i++) {
          if (baseLine[offset] !== SolutionField.No) {
            solution[offset] = SolutionField.Yes;
          } else {
            conflict = true;
          }
          offset++;
        }
      }
      for (let i = offset; i < sizeWithOffset; i++) {
        if (baseLine[i] === SolutionField.Yes) {
          conflict = true;
        }
      }
      if (solution.length !== sizeWithOffset) {
        throw new Error('eh');
      }
      if (!conflict) {
        if (firstSolution === null) {
          firstSolution = this.hardCopyArray(solution);
        } else {
          for (let i = 0; i < sizeWithOffset; i++) {
            if (firstSolution[i] !== solution[i]) {
              firstSolution[i] = SolutionField.Unknown;
            }
          }
        }
      }
      spacings[0]++;
      let spaceUsed = spacings.reduce((prev, curr) => prev + curr, 0);
      let i = 1;
      while (spaceUsed > totalSpace && running) {
        if (i === hints.length ) {
          // debugger;
          // console.log('Dunso?');
          running = false;
          // await this.animationFrame();
        }
        spacings[0] = 0;
        for (let x = 1; x < i; x++) {
          spacings[x] = 1;
        }
        spacings[i]++;
        spaceUsed = spacings.reduce((prev, curr) => prev + curr, 0);
        i++;
      }
      // console.log(spacings, i);
      // running = false;
    }
    if (firstSolution === null) {
      throw new ContradictionError('asd5');
    }
    console.log(offsetStart, offsetEnd, 'asd');
    firstSolution.push(... endDone);
    firstSolution.unshift(... startDone);
    return firstSolution;
    // return [Array(offsetStart).fill(SolutionField.No), ...firstSolution, Array(offsetEnd).fill(SolutionField.No)];
  }
  verifySolution(): boolean {
    for (let rowI = 0; rowI < this.size; rowI++) {
      let colI = 0;
      const hints = this.rowsHints[rowI];
      for (const hint of hints) {
        while (colI < this.size && this.solution[this.getPos(rowI, colI)] === SolutionField.No) {
          colI++;
        }
        if (colI === this.size) {
          return false;
        }
        for (let i = 0; i < hint; i++) {
          if (colI === this.size || this.solution[this.getPos(rowI, colI)] !== SolutionField.Yes) {
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
        while (rowI < this.size && this.solution[this.getPos(rowI, colI)] === SolutionField.No) {
          rowI++;
        }
        if (rowI === this.size) {
          return false;
        }
        for (let i = 0; i < hint; i++) {
          if (rowI === this.size || this.solution[this.getPos(rowI, colI)] !== SolutionField.Yes) {
            return false;
          }
          rowI++;
        }
      }
    }
    return true;
  }
  async solveWithJobs() {
    debugger;
    enum JobType {
      Row,
      Col
    }
    interface Job {
        jobType: JobType;
        index: number;
        priority: number;
    }
    let running = true;
    let rowPriorities = Array(this.size).fill(1);
    let colPriorities = Array(this.size).fill(1);
    while (running) {
      let job: Job = {
        jobType: JobType.Row,
        index: 0,
        priority: 0
      };
      for (const [index, priority] of rowPriorities.entries()) {
        if (priority > job.priority) {
          job.jobType = JobType.Row;
          job.index = index;
          job.priority = priority;
        }
      }
      for (const [index, priority] of colPriorities.entries()) {
        if (priority > job.priority) {
          job.jobType = JobType.Col;
          job.index = index;
          job.priority = priority;
        }
      }
      if (job.priority === 0) {
        running = false;
        break;
      }
      if (job.jobType === JobType.Row) {
        rowPriorities[job.index] = 0;
      } else {
        colPriorities[job.index] = 0;
      }
      if (job.jobType === JobType.Row) {
        this.calculatingCol[0] = -1;
        this.calculatingRow[0] = job.index;
      } else {
        this.calculatingCol[0] = job.index;
        this.calculatingRow[0] = -1;
      }
      const hints = job.jobType === JobType.Row ? this.rowsHints[job.index] : this.colsHints[job.index];
      const result = await this.optimizedRowOrCol(job.jobType === JobType.Row, hints, job.index, Infinity);
      if (result !== false) {
        for (const [i, field] of result.entries()) {
          if (field !== SolutionField.Unknown) {
            const pos = job.jobType === JobType.Row ? this.getPos(job.index, i) : this.getPos(i, job.index);
            if (this.solution[pos] !== field) {
              this.solution[pos] = field;
              if (job.jobType === JobType.Row) {
                colPriorities[i]++;
              } else {
                rowPriorities[i]++;

              }
            }
          }
        }
      }
    }
    console.log(colPriorities, rowPriorities);
    debugger;
  }
  async solve(disableRow: boolean = false, disableCol: boolean = false) {
    let counter = 0;
    let solved = false;
    this.guess = [];
    let maxCost = 30;
    while (!solved) {
      let changed = true;
      let changedLast = true;
      let jumpedOutDirect = true;
      maxCost = 10;
      try {
        while (changed || changedLast) {
          changedLast = changed;
          changed = false;
          let before = JSON.stringify(this.solution);
          if (!disableRow) {
            await this.solveRowsOrColls(true, maxCost);
            // await this.animationFrame();
            this.emitPartial();
          }
          if (!disableCol) {
            await this.solveRowsOrColls(false, maxCost);
            // await this.animationFrame();
            this.emitPartial();
          }
          changed = before !== JSON.stringify(this.solution);
          if (!changed) {
            maxCost += 10;
            console.log('maxCost', maxCost, this.mostExpensiveRowOrCol);
            if (maxCost <= this.mostExpensiveRowOrCol) {
              changed = true;
            }
          }
          if (changed) {
            jumpedOutDirect = false;
          }
          console.log(counter);
        }
      } catch (e) {
        if (e.contradiction) {
          // console.log('found irregular, jumping back', e);
          // console.log(`guess length: ${this.guess.length} typeof: ${typeof this.guess}`);
          if (this.guess.length === 0) {
            throw new Error('found irregular, no guess');
          }
          if (jumpedOutDirect) {
            let i = this.guess.length - 1;
            while (this.guess[i].guessSolution) {
              i--;
            }
            console.log(i, 'i', this.guess);
            this.guess[i].guessSolution = false;
            this.solution = this.guess[i].solutionBefore;
            this.solution[this.getPos(this.guess[i].coordinates.row, this.guess[i].coordinates.col)] = SolutionField.No;
            if (i > 0) {
              this.guess.splice(i + 1);
            } else {
              this.guess.splice(0);
            }
          } else {
            const guess = this.guess[this.guess.length - 1];
            guess.guessSolution = false;
            this.solution = guess.solutionBefore;
            this.solution[this.getPos(guess.coordinates.row, guess.coordinates.col)] = SolutionField.No;

            if (this.guess.length === 1) {
              this.guess.splice(0);
            }
          }
          this.emitPartial();
        } else {
          throw (e);
        }
      }
      solved = true;
      for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
          if (this.solution[this.getPos(row, col)] === SolutionField.Unknown) {
            solved = false;
          }
        }
      }
      // solved = true;
      if (!solved) {
        // guess
        let changedSomething = false;
        for (let row = 0; row < this.size; row++)  {
          for (let col = 0; col < this.size; col++)  {
            if (!changedSomething && this.solution[this.getPos(row, col)] === SolutionField.Unknown) {
              this.solution[this.getPos(row, col)] = SolutionField.Yes;
              changedSomething = true;
              const guess = {
                guessSolution: true,
                coordinates: {
                  row, col
                },
                solutionBefore: this.solution.slice()
              };
              const index = this.guess.push(guess);
              this.guessCoordinates[2 * index] = row;
              this.guessCoordinates[2 * index + 1] = col;
              console.log(guess);
              this.emitPartial();
            }
          }
        }
        // const potGuess = this.findGuessPosition();
        // this.solution[potGuess.row][potGuess.col] = SolutionField.Yes;
        // const guess = {
        //   guessSolution: true,
        //   coordinates: {
        //     row: potGuess.row, col: potGuess.col
        //   },
        //   solutionBefore: this.solution.map(row => row.map(col => col))
        // };
        // this.guess.push(guess);
        // console.log(guess);
        // this.emitGuess();
        // await this.animationFrame();
      } else if (!this.verifySolution()) {
        let i = this.guess.length - 1;
        while (i--) {
           if (this.guess[i].guessSolution === true) {
            break;
          }
        }
        console.log(i, 'i');
        this.guess[i].guessSolution = false;
        for (let x = 0; x < this.size * this.size; x++) {
          this.solution[x] = this.guess[i].solutionBefore[x];
        }
        this.solution[this.getPos(this.guess[i].coordinates.row, this.guess[i].coordinates.col)] = SolutionField.No;
        if (i > 0) {
          this.guess.splice(i + 1);
        } else {
          this.guess.splice(0);
        }
        this.emitPartial();
      }

      counter++;
    }
    if (!this.verifySolution()) {
      throw new Error('Wrong Solution');
    }
    this.doneFlag[0] = 1;
    this.emitPartial();
    this.emit({
      type: 'done'
    });
    // console.log(this);
  }
  findGuessPosition() {
    interface IPotGuess {
      row: number;
      col: number;
      prio: number;
    }
    const potGuesses: IPotGuess[] = [];
    // if (rows) {
    //   this.solution[index][i] = field;
    // } e
    for (let row = 0; row < this.size; row++) {
      let col = 0;
      let prio = 0;
      while (col < this.size) {
        if (this.solution[this.getPos(row, col)] !== SolutionField.Unknown) {
          if (prio > 0) {
            potGuesses.push({
              row,
              col: col - 1,
              prio
            });
            prio = 0;
          }
        } else {
          prio++;
        }
        col++;
      }
    }
    potGuesses.sort((a, b) => {
      return a.prio - b.prio;
    });
    return potGuesses[0];
  }
  filterSolutions(solutions: SolutionField[][], rows: boolean, index: number, hints: number[]) {
    return solutions.filter(solution => {
      let possible = true;
      for (let i = 0; i < this.size; i++) {
        let field = rows ? this.solution[this.getPos(index, i)] : this.solution[this.getPos(i, index)];
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
  }
  generateAllSolutionForRow(hints: number[]): SolutionField[][] {
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
      const solution: SolutionField[] = [];
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

export type Solution = SolutionField[][];
export interface ICoordinate {
  col: number;
  row: number;
}
export interface IGuess {
  guessSolution: boolean;
  coordinates: ICoordinate;
  solutionBefore: Uint8Array;
}
export interface IGuessWithoutSolutionBefore {
  guessSolution: boolean;
  coordinates: ICoordinate;
}
export type IHints = number[][];
