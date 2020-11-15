import * as t from './base'
import { assertEquals } from 'typescript-is'

type Resources<T> = {
  [p in keyof T]: (event: any) => Promise<any>
}

const wait = (seconds: number = 1) => {
  if (seconds < 1) {
    throw new Error('timeout cannot be below 1')
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, seconds * 100)
  })
}

export default class States<T extends t.States<T>> {
  stateMachine: t.StateMachine<T>
  at: keyof T
  resources?: Resources<T>

  constructor(st: {
    StartAt: keyof T,
    States: T,
  }) {
    this.stateMachine = st
    this.at = st.StartAt
  }

  valueOf() {
    this.stateMachine
  }

  assignResources(res: Resources<T>) {
    const states = this.stateMachine.States
    const stateKeys = Object.keys(states)
    // stateKeys.map(key => states[key])
    this.resources = res
  }

  async startExecution(input: t.JsonValue) {
    this.at = this.stateMachine.StartAt
    return await this.step(input)
  }

  isPath(path: string) {
    return /^\$/.test(path)
  }

  path(input: any, path: string) {
    if (!this.isPath(path)) {
      throw new Error(`Invalid Path: ${path}`)
    }

    return path
    .replace(/^\$\./, '')
    .split('.')
    .reduce((acc, segment) => {
      if (segment.endsWith(']')) {
        return acc.concat(segment.slice(0,-1).split('['))
      } 
      return acc.concat([segment])
    }, [] as string[])
    .reduce(
      (acc, val: string) => {
        if (!acc[val] && acc[val] !==  null) {
          throw new Error(`Invalid Path: ${path}`)
        }
        return acc[val]
      },
      input
    )
  }

  parameters<P extends t.JsonValue>(
    params: { [key: string]: t.JsonValue},
    input: P
  ): t.JsonObject {
    return Object.keys(params).reduce((acc, key) => {
      const val = params[key]
            return {
        ...acc,
        //[key]: input[]
      }
    }, {})
  }

  callFunction(input: any, args: string): t.JsonValue {
    const matches = /^States\.([a-zA-Z]+)\((.+)\)$/.exec(args)

    if (matches == null) {
      throw new Error(`Invalid Function: ${args}`)
    }

    const [_, func, params] = matches

    const _args = params.split(',')
    .map(st => st.trim())
    .map(param => {
      if (this.isPath(param)) {
        return this.path(input, param)
      } else if (param.startsWith("'") && param.endsWith("'")){
        return param.slice(1, -1)
      } else {
        return JSON.parse(param)
      }
    })

    console.log(func, _args)
    // @ts-ignore
    return this[func](..._args)
  }

  isFunction(args: string) {
    const matches = /^States\.([a-zA-Z]+)\((.+)\)$/.exec(args)
    if (matches != null) {
      const [_, func, input] = matches
      return (
        ['Format', 'StringToJson', 'JsonToString', 'Array'].includes(func)
        && input != null
      ) 
    }
    return false
  }

  Format(msg: string, ...rest: any[]){
    return rest.reduce((arg, val) => arg.replace(/\{\}/, val), msg)
  }

  JsonToString(val: t.JsonValue) {
    return JSON.stringify(val)
  }

  StringToJson(val: string) {
    return JSON.parse(val)
  }

  Array(...args: any[]) {
    return args
  }

  input(state: t.State<T>, _input: t.JsonValue) {
    let input = _input

    if (state.Type === 'Fail' || state.Type === 'Succeed') {
      return input
    } else if (state.InputPath != null) {
      input = this.path(input, state.InputPath)
    }

    if ((state.Type === 'Task'
      || state.Type === 'Map'
      || state.Type === 'Parallel'
      || state.Type === 'Pass')
      && state.Parameters) {
        input = this.parameters(state.Parameters, input)
    }
    return input
  }

  async output(state: t.State<T>, input: t.JsonValue) {

  }

  async step(_input: t.JsonValue) {
    const states = this.stateMachine.States
    const state = states[this.at as string]
    let res: any = _input
    const input = this.input(state, _input)

    if (state.Type === 'Task' && this.resources && this.resources[this.at]) {
      res = {
        ...await this.resources[this.at](input)
      }
    } else if (state.Type === 'Pass') {
    } else if (state.Type === 'Succeed') {
      return res
    } else if (state.Type === 'Fail') {
      return 'Fail'
    } else if (state.Type === 'Map') {
      return res
    } else if (state.Type === 'Wait') {
      await wait(state.Seconds)
    } else if (state.Type === 'Choice') {
      throw new Error('Choide')
    }

    if (state.Next != null) {
      this.at = state.Next
      this.step(res)
    } else if(state.End) {
      return res
    }
    return res
  }
}
