import * as t from './base'
import { assertEquals } from 'typescript-is'

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const timestampRegex = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\\.[0-9]+)?(Z)?$/

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
  id: string
  execution?: t.Execution
  context?: t.StepFunctionContext<T>

  constructor(st: {
    StartAt: keyof T,
    States: T,
  }, id: string = uuidv4()) {
    this.id = id
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


  async execute({ Input, Id }: Omit<t.Execution, "StartTime">) {
    this.at = this.stateMachine.StartAt
    let input = Input

    this.execution = {
      Input,
      Id,
      StartTime: (new Date()).toISOString()
    }

    while(!this.end) {
      input = await this.step(input)
    }

    return input
  }

  isPath(path: string) {
    return /^\$\$?[^$]?/.test(path)
  }

  assign(input: any, pathString: string, val: any) {
    if (!this.isPath(pathString)) {
      throw new Error(`Invalid Path: ${pathString}`)
    }

    const path = pathString
    .replace(/^\$\./, '')
    .split('.')

    return path.reduce(
      (acc, key, index) => {
        if (path.length - 1 === index) {
          console.log(acc, key)
          acc[key] = val
          return acc
        } else if (!acc[key]){
          acc[key] = {}
          return acc[key]
        } else {
          return acc[key]
        }
      },
      input
    )
  }

  path(_input: any, path: string) {
    if (!this.isPath(path)) {
      throw new Error(`Invalid Path: ${path}`)
    }

    let input = _input

    if (path.startsWith('$$')) {
      input = this.context
    }

    return path
    .replace(/^\$+\./, '')
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
        } else if (!(typeof acc === 'object' && acc.hasOwnProperty(val)) || !(val in acc)) {
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

    if ('Parameters' in state && state.Parameters != null) {
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
      return op.StringGreaterThan < this.path(input, op.Variable)
    } else if ('StringGreaterThanPath' in op) {
      return this.path(input, op.StringGreaterThanPath) < this.path(input, op.Variable)
    } else if ('StringGreaterThanEquals' in op) {
      return op.StringGreaterThanEquals <= this.path(input, op.Variable)
    } else if ('StringGreaterThanEqualsPath' in op) {
      return this.path(input, op.StringGreaterThanEqualsPath) <= this.path(input, op.Variable)
    } else if ('StringLessThan' in op) {
      return op.StringLessThan > this.path(input, op.Variable)
    } else if ('StringLessThanPath' in op) {
      return this.path(input, op.StringLessThanPath) > this.path(input, op.Variable)
    } else if ('StringLessThanEquals' in op) {
      return op.StringLessThanEquals >= this.path(input, op.Variable)
    } else if ('StringLessThanEqualsPath' in op) {
      return this.path(input, op.StringLessThanEqualsPath) >= this.path(input, op.Variable)
    } else if ('NumericEquals' in op) {
      return op.NumericEquals == this.path(input, op.Variable)
    } else if ('NumericEqualsPath' in op) {
      return this.path(input, op.NumericEqualsPath) == this.path(input, op.Variable)
    } else if ('NumericGreaterThan' in op) {
      return op.NumericGreaterThan < this.path(input, op.Variable)
    } else if ('NumericGreaterThanPath' in op) {
      return this.path(input, op.NumericGreaterThanPath) < this.path(input, op.Variable)
    } else if ('NumericGreaterThanEquals' in op) {
      return op.NumericGreaterThanEquals <= this.path(input, op.Variable)
    } else if ('NumericGreaterThanEqualsPath' in op) {
      return this.path(input, op.NumericGreaterThanEqualsPath) <= this.path(input, op.Variable)
    } else if ('NumericLessThan' in op) {
      return op.NumericLessThan > this.path(input, op.Variable)
    } else if ('NumericLessThanPath' in op) {
      return this.path(input, op.NumericLessThanPath) > this.path(input, op.Variable)
    } else if ('NumericLessThanEquals' in op) {
      return op.NumericLessThanEquals >= this.path(input, op.Variable)
    } else if ('NumericLessThanEqualsPath' in op) {
      return this.path(input, op.NumericLessThanEqualsPath) >= this.path(input, op.Variable)
    } else if ('BooleanEquals' in op) {
      return op.BooleanEquals == this.path(input, op.Variable)
    } else if ('BooleanEqualsPath' in op) {
      return this.path(input, op.BooleanEqualsPath) == this.path(input, op.Variable)
    } else if ('TimestampEquals' in op) {
      return op.TimestampEquals == this.path(input, op.Variable)
    } else if ('TimestampEqualsPath' in op) {
      return this.path(input, op.TimestampEqualsPath) == this.path(input, op.Variable)
    } else if ('TimestampLessThan' in op) {
      return new Date(op.TimestampLessThan) > new Date(this.path(input, op.Variable))
    } else if ('TimestampLessThanPath' in op) {
      return new Date(this.path(input, op.TimestampLessThanPath)) > (this.path(input, op.Variable))
    } else if ('TimestampGreaterThan' in op) {
      return new Date(op.TimestampGreaterThan) < new Date(this.path(input, op.Variable))
    } else if ('TimestampGreaterThanPath' in op) {
      return new Date(this.path(input, op.TimestampGreaterThanPath)) < (this.path(input, op.Variable))
    } else if ('TimestampLessThanEquals' in op) {
      return new Date(op.TimestampLessThanEquals) >= new Date(this.path(input, op.Variable))
    } else if ('TimestampLessThanEqualsPath' in op) {
      return new Date(this.path(input, op.TimestampLessThanEqualsPath)) >= (this.path(input, op.Variable))
    } else if ('TimestampGreaterThanEquals' in op) {
      return new Date(op.TimestampGreaterThanEquals) <= new Date(this.path(input, op.Variable))
    } else if ('TimestampGreaterThanEqualsPath' in op) {
      return new Date(this.path(input, op.TimestampGreaterThanEqualsPath)) <= (this.path(input, op.Variable))
    } else if ('IsNull' in op) {
      return op.IsNull === (this.path(input, op.Variable) === null)
    } else if ('IsPresent' in op) {
      try {
        this.path(input, op.Variable) !== undefined
        return op.IsPresent === true
      } catch(er) {
        return op.IsPresent === false
      }
    } else if ('IsNumeric' in op) {
      return op.IsNumeric === (typeof this.path(input, op.Variable) === 'number')
    } else if ('IsString' in op) {
      return op.IsString === (typeof this.path(input, op.Variable) === 'string')
    } else if ('IsBoolean' in op) {
      return op.IsBoolean === (typeof this.path(input, op.Variable) === 'boolean')
    } else if ('IsTimestamp' in op) {
      return op.IsTimestamp === timestampRegex.test(this.path(input, op.Variable))
    } else if ('StringMatches' in op) {
      const matcher = new RegExp(op.StringMatches.replace(/(?<!\\)\*/gi, '.+'))
      return matcher.test(this.path(input, op.Variable))
    } else {
      throw new Error(`Method not implemented ${Object.keys(op)}`)
    }
  }

  evaluateChoiceRule(exp: t.LogicalExpression, input: t.JsonValue): boolean {
    if ('And' in exp) {
      return exp.And.reduce((res, val) => res && this.evaluateChoiceRule(val, input), true as boolean)
    } else if ('Or' in exp) {
      return exp.Or.reduce((res, val) => res || this.evaluateChoiceRule(val, input), false as boolean)
    } else if ('Not' in exp) {
      return !this.evaluateChoiceRule(exp.Not, input)
    } else {
      return this.evaluateLogicalOperator(exp, input)
    }
  }

  output(state: t.State<T>, input: t.JsonValue, val: any) {
    let res = val

    if ('ResultPath' in state && state.ResultPath != null) {
      res = this.assign(input, state.ResultPath, res)
    }
    return res
  }

  updateContext() {
    if (this.execution == null) {
      throw new Error('execution undefined')
    }
    if (this.at == null) {
      throw new Error('state undefined')
    }

    this.context = {
      Execution: this.execution,
      State: {
        EnteredTime: (new Date()).toISOString(),
        Name: this.at,
        RetryCount: 0
      },
      StateMachine: {
        Id: this.id
      },
      Task: {
      }
    }
  }

  async step(_input: t.JsonValue) {
    const states = this.stateMachine.States
    const state = states[this.at as string]
    const input = this.input(state, _input)
    let res: any = input
    let next: keyof T | null = null
    this.updateContext()

    if (state.Type === 'Task' && this.resources && this.resources[this.at]) {
      res = {
        ...await this.resources[this.at](input)
      }
    } else if (state.Type === 'Pass') {
      if ('Result' in state) {
        res = state.Result
      }
    } else if (state.Type === 'Succeed') {
      return res
    } else if (state.Type === 'Fail') {
      return 'Fail'
    } else if (state.Type === 'Map') {
      return res
    } else if (state.Type === 'Wait') {
      await wait(state.Seconds)
    } else if (state.Type === 'Choice') {
      const validChoices = state.Choices.map((choice) => ({
        next: choice.Next,
        result: this.evaluateChoiceRule(choice, input)
      }))
      .filter(choice => choice.result === true)
      .map(choice => choice.next)

      if (validChoices.length > 0) {
        next = validChoices[0]
      } else if (state.Default != null) {
        next = state.Default
      } else {
        throw new Error('States.NoChoiceMatched')
      }
    }

    res = this.output(state, input, res)

    if (next != null) {
      this.at = next
      return res
    } else {
      this.end = true
      return res
    }
  }
}
