import { StateMachine, StartAt, States, State } from './base'



function create<T extends { [key: string]: State<T>}>(StartAt: keyof T, States: T): StateMachine<T> {
  return {
    StartAt,
    States
  }
}


// create(
//   'one',
//   {
//     one: {
//       Type: 'Task',
//       End: true
//     }
//   }
// )


// class Machine<T> {
//   stateMachine: StateMachine<T>
// 
//   constructor(st: T extends StateMachine<T> ? StateMachine<T> : never){
//     this.stateMachine = st
//   }
// }

// const machine: StateMachine<T> = {
//   StartAt: 'Hello',
//   States: {
// 
//   }
// }

interface C {
  c: string
}

interface E {
  e: string
}


interface D {
  d: string
}

interface A extends C, E {
  key: 'a'
}

interface B extends D {
  key: 'b'
}

type U = A | B

const u: U = {
  key: 'a'
}
