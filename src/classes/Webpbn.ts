import {readFile, readdir} from 'fs';
import {promisify} from 'util';
import {env} from 'process';
const readFilePromise = promisify(readFile);
const readdirPromise = promisify(readdir);

export class Webpbn {
  private db: string[] = [];
  async generateDb() {
    const db = env.PWD + '/nonogram-db';
    await this.parseDir(db);
  }
  async parseDir(dir: string) {
    const subs = await readdirPromise(dir, {withFileTypes: true});
    for (const sub of subs) {
      // console.log(sub);

      if (sub.isDirectory()) {
        // console.log('isDir');
        await this.parseDir(dir + '/' + sub.name);
      } else if (sub.isFile() && sub.name.match(/\.non$/) !== null) {
        console.log('isFile', sub.name);
        this.db.push(dir + '/' + sub.name);
      } else {
        // console.log('else');

      }
    }
  }
  async getFromDb(random = false) {
    console.log(this.db);
    if (this.db.length === 0) {
      await this.generateDb();
    }
    console.log(this.db[0]);
    let path;
    if (random) {
      path = this.db[Math.floor(Math.random() * this.db.length)];
    } else {
      path = this.db.pop();
    }
    if (!path) {
      throw new Error();
    }
    const text = await readFilePromise(path, {encoding: 'utf8'});
    console.log(text);
    const match = text.match(/rows\s+([0-9\s,]+)/m);
    if (match === null) {
      throw new Error();
    }
    const rowHints = match[1].trim().split('\n').map(row => row.split(',').map(hint => parseInt(hint, 10)));
    const matchCol = text.match(/columns\s+([0-9\s,]+)/m);
    if (matchCol === null) {
      throw new Error();
    }
    const colHints = matchCol[1].trim().split('\n').map(row => row.split(',').map(hint => parseInt(hint, 10)));
    console.log({rowHints, colHints}, match);
    return {rowHints, colHints};
  }
  async getRandom() {
    const response = await fetch('http://localhost:9615');
    const {rowHints, colHints} = await response.json();

    return {rowHints, colHints};
   }
  getFromText() {
    console.log(__dirname);
//     const text = `width 35
// height 40
// rows
// 2
// 3 3
// 2 2 1
// 1 1 3 1
// 3 5
// 1 3 3 1
// 2 2 1 2
// 1 1 7
// 3 2 3 3
// 2 2 1 3 2
// 2
// 1 3
// 2 4
// 1 4
// 1
// columns
// 4
// 1 2 3
// 3 2
// 1
// 2
// 3 2 2
// 2 3 1 3
// 7 1 3
// 2 2 2
// 1 3 4 1
// 5 3
// 1 3 1 1
// 1 2 2
// 3 4
// 2 2`;
    const text = `width 35
height 40
rows
11
13
15
17
19
20
3 3
3 3
3 2
3 4 4 2
3 1 3 1 3 2
3 2 2 2
3 2
3 2
2 1 1 2
5 1 1 5
1 1 1 1 1 1
1 1 1 1 1 1 1 1
1 1 1 1 1 1
1 1 1 1
4 1 1 3
2 2 2 2
1 4 1
1 2
20 3
1 1 1 1 1 1 1 1 1 2 1 3
26 1 1
1 1 1 1 1 1 1 1 1 5 1 1 1
24 1 1 1
3 1 3 1 1
3 2 1 1 1
3 2 1 1
3 1 2 1 1
10 3 1
1 1 1 2
6 6 1 1
17 6
19 6
19 6
19 6
columns
0
6
1 1
1 2 1
9 2
14 8
11 1 1 2 3
5 7 4
5 1 1 4 5
6 2 5 3 5
6 1 1 1 1 3 5
6 3 5 2 5
6 3 8 1 1 1 1 5
6 1 2 5 7
6 1 1 1 1 1 4
6 1 5 2 4
6 2 1 1 1 1 4
6 2 8 5 7
6 1 1 1 1 1 5
6 3 5 2 5
5 3 1 1 1 2 5
4 1 5 2 5
4 1 1 3 5
4 5 4
13 7 3
9 3 4
1 2 2 8
1 1 3 1
6 1 3 7
1 4
5 4
1 4
5 4
1 6
10`;
    const lines = text.split('\n');
    const rowHints = [];
    const colHints = [];
    let lineI = 3;
    while (typeof lines[lineI] !== 'undefined' && lines[lineI].match(/columns/i) === null) {
      const line = lines[lineI];
      if (line === '0') {
        rowHints.push([]);
      } else {
        rowHints.push(line.split(' ').filter(hint => hint !== '').map(hint => parseInt(hint, 10)));
      }
      lineI++;
    }
    lineI++;
    while (typeof lines[lineI] !== 'undefined' && lines[lineI] !== 'columns') {
      const line = lines[lineI];
      if (line === '0') {
        colHints.push([]);
      } else {
        colHints.push(line.split(' ').filter(hint => hint !== '').map(hint => parseInt(hint, 10)));
      }
      lineI++;
    }
    lineI++;
    return {rowHints, colHints};

  }
}
export const webpbn = new Webpbn();
