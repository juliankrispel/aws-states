// utility 
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
        [K in Keys]-?:
            Required<Pick<T, K>>
            & Partial<Record<Exclude<Keys, K>, undefined>>
    }[Keys]

type Impossible<K extends keyof any> = {
  [P in K]: never;
};

// Base interfaces
export interface IO {
  InputPath?: string
  OutputPath?: string
}

export type JsonValue = number | string | boolean | JsonValue[] | JsonObject

export type JsonObject = {
  [key: string]: JsonValue
}

export interface End {
  End: true
}

export interface Expirable {
  Seconds?: number
  SecondsPath?: number
  Timestamp?: string
  TimestampPath?: string
}

export interface TimeoutSeconds {
  TimeoutSeconds?: number
  TimeoutSecondsPath?: string
}

export interface HeartbeatSeconds {
  HeartbeatSeconds?: number
  HeartbeatSecondsPath?: string
}


export interface ResultPath {
  ResultPath?: string
}

export interface Parameters {
  Parameters?: JsonValue
}

export interface ResultSelector {
  ResultSelector?: object
}

export interface RetryCatch<T> {
  Retry?: Retry[]
  Catch?: Catch<T>[]
}

export type Next<T> = {
  Next: keyof T
}

export type Step<T> = {
  Next?: keyof T
  End?: boolean
}

export interface Comment {
  Comment?: string,
}

// Exception handling
export interface Catch<T> extends Next<T> {
  ErrorEquals: string[],
  ResultPath: string,
}

export interface Retry {
  ErrorEquals: string[],
  IntervalSeconds?: number,
  BackoffRate?: number,
  MaxAttempts?: number,
}

// Expressions

export interface Or { Or: Operator[] }
export interface And { And: Operator[]}
export interface Not { Not: Operator }

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
export interface StartAt<T> {
  StartAt: keyof T
}

export interface States<T> {
  [key: string]: State<T>
}

export interface StateMachine<T> extends StartAt<T> {
  States: States<T> 
}

// State interfaces
// Step<T>
export interface FullBaseClass<T> extends Comment, Step<T>, IO, ResultPath, Parameters, ResultSelector, RetryCatch<T> {}

export interface TaskState<T> extends FullBaseClass<T>, HeartbeatSeconds, TimeoutSeconds {
  Type: "Task"
  Resource: string,
}

export interface ParallelState<T> extends FullBaseClass<T> {
  Type: "Parallel"
  Branches: StateMachine<unknown>[]
}

export interface MapState<T> extends FullBaseClass<T> {
  Type: "Map",
  ItemsPath?: string,
}

export interface PassState<T> extends Comment, Step<T>, IO, ResultPath, Parameters {
  Type: "Pass",
  Result?: {
    [key: string]: JsonValue
  },
}

export interface WaitState<T> extends Comment, Step<T>, IO, Expirable {
  Type: "Wait",
}

export interface ChoiceState<T> extends Comment, IO {
  Type: "Choice",
  Default?: keyof T,
  Choices: Choice<T>[]
}

export interface SucceedState extends Comment, IO {
  Type: "Succeed"
}

export interface FailState extends Comment {
  Type: "Fail",
  Error: string,
  Cause: string,
}

export type State<T> =
  | FailState
  | SucceedState
  | ChoiceState<T>
  | RequireAtLeastOne<WaitState<T>, "End" | "Next">
  | RequireAtLeastOne<PassState<T>, "End" | "Next">
  | RequireAtLeastOne<MapState<T>, "End" | "Next">
  | RequireAtLeastOne<ParallelState<T>, "End" | "Next">
  | RequireAtLeastOne<TaskState<T>, "End" | "Next">
