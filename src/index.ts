import { StateMachine, StartAt, States, State, PassState } from './base'

function create<T>(
  st: {
    StartAt: keyof T,
    States: States<T>
  }
): StateMachine<T> {
  return st 
}

create({
  StartAt: 'one',
  States: {
    one: {
      Type: 'Task',
      Resource: 'hello',
      End: true
    },
    two: {
      Type: 'Pass',
      Resource: 'dwq',
      End: true
    }
  }
})

// function create<T>(StartAt: keyof T, States: States<T>): StateMachine<T> {
//   return {
//     StartAt,
//     States
//   }
// }
// 
// create(
//   'one',
//   {
//     one: {
//       Type: 'Task',
//       Resource: 'something',
//       End: true
//     },
//     two: {
//       Type: 'Pass',
//       Red: 'dwq',
//       End: true
//     }
//   }
// )

const state: States<any> = {
  one: {
    Type: 'Task',
    Resource: 'something',
    Next: 'two'
  },
  two: {
    Type: 'Pass',
    Red: 'dwq',
    End: true
  },
}


// const some = <T>(t: T): Pick<T, "states"> => {
// 
// }


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

interface A {
  a: 1
}


const hel: A = {
  a: 1,
  b: 2
}
