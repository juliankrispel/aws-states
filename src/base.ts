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
  Parameters?: JsonObject
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

export interface Or { Or: LogicalOperator[] }
export interface And { And: LogicalOperator[]}
export interface Not { Not: LogicalOperator }

export type LogicalExpression = Or | And | Not | LogicalOperator
export type Choice<T> = Next<T> & LogicalExpression 

// Comparison operators
export type StringEquals = { Variable: string, StringEquals: string }
export type StringEqualsPath = { Variable: string, StringEqualsPath: string }
export type StringLessThan = { Variable: string, StringLessThan: string }
export type StringLessThanPath = { Variable: string, StringLessThanPath: string }
export type StringGreaterThan = { Variable: string, StringGreaterThan: string }
export type StringGreaterThanPath = { Variable: string, StringGreaterThanPath: string }
export type StringLessThanEquals = { Variable: string, StringLessThanEquals: string }
export type StringLessThanEqualsPath = { Variable: string, StringLessThanEqualsPath: string }
export type StringGreaterThanEquals = { Variable: string, StringGreaterThanEquals: string }
export type StringGreaterThanEqualsPath = { Variable: string, StringGreaterThanEqualsPath: string }
export type StringMatches = { Variable: string, StringMatches: string }
export type NumericEquals = { Variable: string, NumericEquals: number }
export type NumericEqualsPath = { Variable: string, NumericEqualsPath: string }
export type NumericLessThan = { Variable: string, NumericLessThan: number }
export type NumericLessThanPath = { Variable: string, NumericLessThanPath: string }
export type NumericGreaterThan = { Variable: string, NumericGreaterThan: number }
export type NumericGreaterThanPath = { Variable: string, NumericGreaterThanPath: string }
export type NumericLessThanEquals = { Variable: string, NumericLessThanEquals: number }
export type NumericLessThanEqualsPath = { Variable: string, NumericLessThanEqualsPath: string }
export type NumericGreaterThanEquals = { Variable: string, NumericGreaterThanEquals: number }
export type NumericGreaterThanEqualsPath = { Variable: string, NumericGreaterThanEqualsPath: string }
export type BooleanEquals = { Variable: string, BooleanEquals: boolean }
export type BooleanEqualsPath = { Variable: string, BooleanEqualsPath: string }
export type TimestampEquals = { Variable: string, TimestampEquals: string }
export type TimestampEqualsPath = { Variable: string, TimestampEqualsPath: string }
export type TimestampLessThan = { Variable: string, TimestampLessThan: string }
export type TimestampLessThanPath = { Variable: string, TimestampLessThanPath: string }
export type TimestampGreaterThan = { Variable: string, TimestampGreaterThan: string }
export type TimestampGreaterThanPath = { Variable: string, TimestampGreaterThanPath: string }
export type TimestampLessThanEquals = { Variable: string, TimestampLessThanEquals: string }
export type TimestampLessThanEqualsPath = { Variable: string, TimestampLessThanEqualsPath: string }
export type TimestampGreaterThanEquals = { Variable: string, TimestampGreaterThanEquals: string }
export type TimestampGreaterThanEqualsPath = { Variable: string, TimestampGreaterThanEqualsPath: string }
export type IsNull = { Variable: string, IsNull: boolean }
export type IsPresent = { Variable: string, IsPresent: boolean }
export type IsNumeric = { Variable: string, IsNumeric: boolean }
export type IsString = { Variable: string, IsString: boolean }
export type IsBoolean = { Variable: string, IsBoolean: boolean }
export type IsTimestamp = { Variable: string, IsTimestamp: boolean }
export type LogicalOperator = 
  | StringEquals
  | StringEqualsPath
  | StringEqualsPath
  | StringLessThan
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


export type StepFunctionContext = {
  Execution: {
    Id: string
    Input: JsonValue
    StartTime: string
  };
  State: {
    EnteredTime: string
    Name: string
    RetryCount: number
  };
  StateMachine: {
    Id: string
  };
  Task: {
    Token: string
  };
};
