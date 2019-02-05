import {Picross} from './Picross';
const ctx: Worker = self as any;

let picross: Picross;
// console.log('Hello From Worker', ctx);
ctx.onmessage = event => {
  // console.log('Hello From Worker Events', event);
  if (event.data.type === 'hints') {
    picross = new Picross(event.data.rowsHints, event.data.colsHints, obj => {
      ctx.postMessage(obj);
    });
  } else if (event.data.type === 'solve') {
    // console.error('test');
    try {
      picross.solve();
    } catch (e) {
      console.error(e);
    }
  }
};
