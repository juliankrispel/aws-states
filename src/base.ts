
// Base Types
export type IO = {
  InputPath?: string
  OutputPath?: string
}


export type JsonValue = number | string | boolean | JsonValue[] | {
  [key: string]: JsonValue
}

export type Next<T> = {
  Next: keyof T
}

export type End = {
  End: boolean
}

export type Seconds = {
  Seconds: number
}

export type SecondsPath = {
  SecondsPath: number
}

export type Timestamp = {
  Timestamp: string
}

export type TimestampPath = {
  TimestampPath: string
}

export type Expirable = Seconds | Timestamp | TimestampPath | SecondsPath

export type TimeoutSeconds = {
  TimeoutSeconds: number
} | {
  TimeoutSecondsPath: string
} | {}

export type HeartbeatSeconds = {
  HeartbeatSeconds: number
} | {
  HeartbeatSecondsPath: string
} | {}


export type ResultPath = {
  ResultPath?: string
}

export type Parameters = {
  Parameters?: object
}

export type ResultSelector = {
  ResultSelector?: object
}

export type RetryCatch<T> = {
  Retry?: Retry[]
  Catch?: Catch<T>[]
}

export type Step<T> = Next<T> | End

export type Comment = {
  Comment?: string,
}

// Exception handling

export type Catch<T> = Next<T> & {
  ErrorEquals: string[],
  ResultPath: string,
}

export type Retry = {
  ErrorEquals: string[],
  IntervalSeconds?: number,
  BackoffRate?: number,
  MaxAttempts?: number,
}

// Expressions

export type Or = { Or: Operator[] }
export type And = { And: Operator[]}
export type Not = { Not: Operator }

export type LogicalExpression = Or | And | Not | Operator
export type Choice<T> = Next<T> & LogicalExpression 

// Comparison operators
export type Variable = { Variable: string }
export type StringEquals = { StringEquals: string }
export type StringEqualsPath = Variable & { StringEqualsPath: string }
export type StringLessThan = { StringLessThan: string }
export type StringLessThanPath = Variable & { StringLessThanPath: string }
export type StringGreaterThan = { StringGreaterThan: string }
export type StringGreaterThanPath = Variable & { StringGreaterThanPath: string }
export type StringLessThanEquals = { StringLessThanEquals: string }
export type StringLessThanEqualsPath = Variable & { StringLessThanEqualsPath: string }
export type StringGreaterThanEquals = { StringGreaterThanEquals: string }
export type StringGreaterThanEqualsPath = Variable & { StringGreaterThanEqualsPath: string }
export type StringMatches = { StringMatches: string }
export type NumericEquals = { NumericEquals: number }
export type NumericEqualsPath = Variable & { NumericEqualsPath: number }
export type NumericLessThan = { NumericLessThan: number }
export type NumericLessThanPath = Variable & { NumericLessThanPath: number }
export type NumericGreaterThan = { NumericGreaterThan: number }
export type NumericGreaterThanPath = Variable & { NumericGreaterThanPath: number }
export type NumericLessThanEquals = { NumericLessThanEquals: number }
export type NumericLessThanEqualsPath = Variable & { NumericLessThanEqualsPath: number }
export type NumericGreaterThanEquals = { NumericGreaterThanEquals: number }
export type NumericGreaterThanEqualsPath = Variable & { NumericGreaterThanEqualsPath: number }
export type BooleanEquals = { BooleanEquals: boolean }
export type BooleanEqualsPath = Variable & { BooleanEqualsPath: boolean }
export type TimestampEquals = { TimestampEquals: string }
export type TimestampEqualsPath = Variable & { TimestampEqualsPath: string }
export type TimestampLessThan = { TimestampLessThan: string }
export type TimestampLessThanPath = Variable & { TimestampLessThanPath: string }
export type TimestampGreaterThan = { TimestampGreaterThan: string }
export type TimestampGreaterThanPath = Variable & { TimestampGreaterThanPath: string }
export type TimestampLessThanEquals = { TimestampLessThanEquals: string }
export type TimestampLessThanEqualsPath = Variable & { TimestampLessThanEqualsPath: string }
export type TimestampGreaterThanEquals = { TimestampGreaterThanEquals: string }
export type TimestampGreaterThanEqualsPath = Variable & { TimestampGreaterThanEqualsPath: string }
export type IsNull = { IsNull: string }
export type IsPresent = { IsPresent: string }
export type IsNumeric = { IsNumeric: string }
export type IsString = { IsString: string }
export type IsBoolean = { IsBoolean: string }
export type IsTimestamp = { IsTimestamp: string }
export type Operator = 
  | StringEquals
  | StringEqualsPath
  | StringEqualsPath
  | StringLessThanPath
  | StringLessThanPath
  | StringLessThanPath
  | StringGreaterThan
  | StringGreaterThanPath
  | StringLessThanEquals
  | StringLessThanEqualsPath
  | StringGreaterThanEquals
  | StringGreaterThanEqualsPath
  | StringMatches
  | NumericEquals
  | NumericEqualsPath
  | NumericLessThan
  | NumericLessThanPath
  | NumericGreaterThan
  | NumericGreaterThanPath
  | NumericLessThanEquals
  | NumericLessThanEqualsPath
  | NumericGreaterThanEquals
  | NumericLessThanEqualsPath
  | NumericGreaterThanEquals
  | NumericGreaterThanEqualsPath
  | BooleanEquals
  | BooleanEqualsPath
  | TimestampEquals
  | TimestampEqualsPath
  | TimestampLessThan
  | TimestampLessThanPath
  | TimestampGreaterThan
  | TimestampGreaterThan
  | TimestampGreaterThanPath
  | TimestampLessThanEquals
  | TimestampLessThanEqualsPath
  | TimestampGreaterThanEquals
  | TimestampGreaterThanEqualsPath
  | IsNull
  | IsPresent
  | IsNumeric
  | IsString
  | IsBoolean
  | IsTimestamp

// Branches

// StateMachine
export type StartAt<T> = {
  StartAt: keyof T,
}

export type States<T> = {
  States: {
    [key: string]: State<T>
  }
}

export type StateMachine<T> = StartAt<T> & States<T>

// State Types
export type FullBaseClass<T> = Comment & IO & Step<T> & ResultPath & Parameters & ResultSelector & RetryCatch<T>

export type TaskState<T> = {
  Type: "Task"
} & {
  Resource: string,
} & FullBaseClass<T> & HeartbeatSeconds & TimeoutSeconds

export type ParallelState<T> =  {
  Type: "Parallel"
} & {
  Branches: StateMachine<any>[]
} & FullBaseClass<T>

export type MapState<T> = FullBaseClass<T> & {
  Type: "Map"
}

export type PassState<T> = Comment & IO & Step<T> & ResultPath & Parameters & {
  Type: "Pass",
  Result?: JsonValue,
}

export type WaitState<T> = Comment & IO & Step<T> & Expirable & {
  Type: "Wait",
}

export type ChoiceState<T> = Comment & IO & {
  Type: "Choice",
  Default?: keyof T,
  Choices: Choice<T>[]
}

export type SucceedState = Comment & IO & {
  Type: "Succeed"
}

export type FailState = Comment & {
  Type: "Fail",
  Error: string,
  Cause: string,
}


export type State<T> =
  | TaskState<T>
  | FailState
  | SucceedState
  | ChoiceState<T>
  | WaitState<T>
  | PassState<T>
  | MapState<T>
  | ParallelState<T>
