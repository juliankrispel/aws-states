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
  end: boolean = false
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

  async startExecution(_input: t.JsonValue) {
    this.at = this.stateMachine.StartAt
    let input = _input

    while(!this.end) {
      input = await this.step(input)
    }

    return input
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
        const matches = /(-?[0-9]+)?:(-?[0-9]+)?/.exec(val)
        console.log(matches)
        if (matches != null && val.length > 1 && Array.isArray(acc)) {
          let start = matches[1] != null ? parseInt(matches[1]) : 0
          let end = matches[2] != null ? parseInt(matches[2]) : undefined
          if (start < 0) {
            start = 0
          }
          if (end != null && end < start) {
            end = start
          }

          return acc.slice(start, end)
        } else if (!acc[val] && acc[val] !==  null) {
          throw new Error(`Invalid Path: ${path}`)
        }
        return acc[val]
      },
      input
    )
  }

  value(input: t.JsonValue, val: t.JsonValue) {
    if (Array.isArray(val)) {
      return val
    } else if (typeof val === 'object') {
      return this.parameters(val, input)
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      return val
    } else if (this.isPath(val)) {
      return this.path(input, val)
    } else if (this.isFunction(val)) {
      return this.callFunction(input, val)
    } else {
      return val
    }
  }

  parameters(
    params: t.JsonObject,
    input: t.JsonValue
  ): t.JsonObject {
    return Object.keys(params).reduce((acc, key) => {
      const val = params[key]
      return {
        ...acc,
        [key]: this.value(input, val)
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

  evaluateLogicalOperator(op: t.LogicalOperator, input: t.JsonValue): boolean {
    if ('StringEquals' in op) {
      return op.StringEquals == this.path(input, op.Variable)
    } else if ('StringEqualsPath' in op) {
      return this.path(input, op.StringEqualsPath) == this.path(input, op.Variable)
    } else if ('StringGreaterThan' in op) {
      return op.StringGreaterThan > this.path(input, op.Variable)
    } else if ('StringGreaterThanPath' in op) {
      return this.path(input, op.StringGreaterThanPath) > this.path(input, op.Variable)
    } else if ('StringGreaterThanEquals' in op) {
      return op.StringGreaterThanEquals >= this.path(input, op.Variable)
    } else if ('StringGreaterThanEqualsPath' in op) {
      return this.path(input, op.StringGreaterThanEqualsPath) >= this.path(input, op.Variable)
    } else if ('StringLessThan' in op) {
      return op.StringLessThan < this.path(input, op.Variable)
    } else if ('StringLessThanPath' in op) {
      return this.path(input, op.StringLessThanPath) < this.path(input, op.Variable)
    } else if ('StringLessThanEquals' in op) {
      return op.StringLessThanEquals <= this.path(input, op.Variable)
    } else if ('StringLessThanEqualsPath' in op) {
      return this.path(input, op.StringLessThanEqualsPath) <= this.path(input, op.Variable)
    } else if ('NumericEquals' in op) {
      return op.NumericEquals == this.path(input, op.Variable)
    } else if ('NumericEqualsPath' in op) {
      return this.path(input, op.NumericEqualsPath) == this.path(input, op.Variable)
    } else if ('NumericGreaterThan' in op) {
      return op.NumericGreaterThan > this.path(input, op.Variable)
    } else if ('NumericGreaterThanPath' in op) {
      return this.path(input, op.NumericGreaterThanPath) > this.path(input, op.Variable)
    } else if ('NumericGreaterThanEquals' in op) {
      return op.NumericGreaterThanEquals >= this.path(input, op.Variable)
    } else if ('NumericGreaterThanEqualsPath' in op) {
      return this.path(input, op.NumericGreaterThanEqualsPath) >= this.path(input, op.Variable)
    } else if ('NumericLessThan' in op) {
      return op.NumericLessThan < this.path(input, op.Variable)
    } else if ('NumericLessThanPath' in op) {
      return this.path(input, op.NumericLessThanPath) < this.path(input, op.Variable)
    } else if ('NumericLessThanEquals' in op) {
      return op.NumericLessThanEquals <= this.path(input, op.Variable)
    } else if ('NumericLessThanEqualsPath' in op) {
      return this.path(input, op.NumericLessThanEqualsPath) <= this.path(input, op.Variable)
    } else if ('BooleanEquals' in op) {
      return op.BooleanEquals == this.path(input, op.Variable)
    } else if ('BooleanEqualsPath' in op) {
      return this.path(input, op.BooleanEqualsPath) == this.path(input, op.Variable)
    } else if ('TimestampEquals' in op) {
      return op.TimestampEquals == this.path(input, op.Variable)
    } else if ('TimestampEqualsPath' in op) {
      return this.path(input, op.TimestampEqualsPath) == this.path(input, op.Variable)
    }
  }

  evaluateExpression(exp: t.LogicalExpression, input: t.JsonValue): boolean {
    if ('And' in exp) {
      return exp.And.reduce((res, val) => res && this.evaluateExpression(val, input), true as boolean)
    } else if ('Or' in exp) {
      return exp.Or.reduce((res, val) => res || this.evaluateExpression(val, input), false as boolean)
    } else if ('Not' in exp) {
      return !this.evaluateExpression(exp.Not, input)
    } else {
      return this.evaluateLogicalOperator(exp, input)
    }
  }

  async output(state: t.State<T>, input: t.JsonValue) {
  }

  async step(_input: t.JsonValue) {
    const states = this.stateMachine.States
    const state = states[this.at as string]
    const input = this.input(state, _input)
    let res: any = input

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
      return res
    } else {
      this.end = true
      return res
    }
  }
}
