import S, { ErrorCodes } from '../'
jest.mock('@aws-sdk/client-lambda-node')
import { mocked } from 'ts-jest'
import { Lambda as _Lambda } from '@aws-sdk/client-lambda-node'
import { Retry, TaskState } from '../base'
const Lambda = mocked(_Lambda)

const encoder = new TextEncoder()
const payload = { hello: 'world' }
const invoke = jest.spyOn(Lambda.prototype, 'invoke')
invoke.mockResolvedValue({
  // @ts-ignore
  Payload: encoder.encode(JSON.stringify(payload))
})

class MyError extends Error {
  name = 'MyError'
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('States', () => {
  let s = new S({
    StartAt: 'one',
    States: {
      one: {
        Type: 'Task',
        Resource: 'arn:aws:lambda:us-east-1:492107414874:function:test',
        Retry: [{
          ErrorEquals: [ErrorCodes.All],
        }],
        End: true
      }
    }
  })

  it('instantiates a valid state machine', () => {
    expect(s.stateMachine).toMatchSnapshot()
  })

  describe('path', () => {
    test.each`
      path                        | input                                 | expected
      ${'$.msg'}                  | ${{msg: 'Hello World'}}               | ${'Hello World'}
      ${'msg.$'}                  | ${{msg: 'Hello World'}}               | ${Error('Invalid Path: msg.$')}
      ${'msg'}                    | ${{msg: 'Hello World'}}               | ${Error('Invalid Path: msg')}
      ${'$.a.b'}                  | ${{a: 'a'}}                           | ${Error('Invalid Path: $.a.b')}
      ${'$.a.b'}                  | ${{a: { b: 'c'}}}                     | ${'c'}
      ${'$.a[0]'}                 | ${{a: [1,2,3]}}                       | ${1}
      ${'$.a[0]'}                 | ${{a: { b: 1 }}}                      | ${Error('Invalid Path: $.a[0]')}
      ${'$.a[0].b'}               | ${{a: [{ b: 1 }]}}                    | ${1}
      ${'$.a[0:1]'}               | ${{a: [1,2,3]}}                       | ${[1]}
      ${'$.a[0:2]'}               | ${{a: [1,2,3]}}                       | ${[1, 2]}
      ${'$.a[1:3]'}               | ${{a: [1,2,3]}}                       | ${[2, 3]}
      ${'$.a[1:]'}                | ${{a: [1,2,3]}}                       | ${[2, 3]}
      ${'$.a[2:-1]'}              | ${{a: [1,2,3]}}                       | ${[]}
      ${'$.a[-1:-0]'}             | ${{a: [1,2,3]}}                       | ${[]}
    `(`path("$path", $input) matches $expected`, ({ path, input, expected }) => {
      if (expected.constructor === Error) {
        expect(() => { s.path(input, path)})
          .toThrowError(expected.message)
      } else  {
        expect(S.prototype.path(input, path)).toEqual(expected)
      }
    })
  })

  describe('isFunction', () => {
    test.each`
      input                                                        | expected
      ${"States.Array('Foo', 2020, $.someJson, null)"}             | ${true}
      ${"States.Format('Hello {}', 'World')"}                      | ${true}
      ${"States.Dormat('Hello {}', 'World')"}                      | ${false}
      ${"States.StringToJson($.a)"}                                | ${true}
      ${"States.JsonToString($.b)"}                                | ${true}
    `('$input produces $expected', ({ input, expected }) => {
      expect(S.prototype.isFunction(input)).toEqual(expected)
    })
  })

  describe('callFunction', () => {
    test.each`
      args                                          |  input                            | expected
      ${'States.JsonToString($.a)'}                 |  ${{ a: { b: 12 } }}              | ${"{\"b\":12}"}
      ${'States.StringToJson($.a)'}                 |  ${{ a: "{\"b\":12}" }}           | ${{ b: 12 }}
      ${"States.Format('Hello {} {}', $.a, $.b)"}   |  ${{ a: 'Mr', b: 'Bloomberg' }}   | ${'Hello Mr Bloomberg'}
      ${"States.Array($.a, 'Foo', 2020, null)"}     |  ${{ a: { b: 12 } }}              | ${[{ b: 12 }, 'Foo', 2020, null]}
    `('$args with $input produces $expected ', ({ args, input, expected }) => {
      if (expected.constructor === Error) {
        expect(() => { S.prototype.callFunction(input, args)})
          .toThrowError(expected.message)
      } else  {
        expect(S.prototype.callFunction(input, args)).toEqual(expected)
      }
    })
  })

  describe('evaluateLogicalOperator', () => {
    test.each`
      args                                                                       |  input                                  | expected
      ${{ StringEquals: 'a', Variable: '$.a'}}                                   |  ${{ a: 'a' }}                          | ${true}
      ${{ StringEquals: 'a', Variable: '$.a'}}                                   |  ${{ a: 'b' }}                          | ${false}
      ${{ StringEquals: '$.a', Variable: '$.a'}}                                 |  ${{ a: '$.a' }}                        | ${true}
      ${{ StringEqualsPath: '$.a', Variable: '$.a'}}                             |  ${{ a: 'b' }}                          | ${true}
      ${{ StringEqualsPath: '$.b', Variable: '$.a'}}                             |  ${{ a: 'b', b: 'b' }}                  | ${true}
      ${{ StringEqualsPath: '$.b', Variable: '$.a'}}                             |  ${{ a: 'b', b: 'c' }}                  | ${false}
      ${{ StringEqualsPath: 'b', Variable: '$.a'}}                               |  ${{ a: 'b', b: 'c' }}                  | ${Error('Invalid Path: b')}
      ${{ StringGreaterThan: 'b', Variable: '$.a'}}                              |  ${{ a: 'c' }}                          | ${true}
      ${{ StringGreaterThan: 'c', Variable: '$.a'}}                              |  ${{ a: 'c' }}                          | ${false}
      ${{ StringGreaterThanPath: 'c', Variable: '$.a'}}                          |  ${{ a: 'c' }}                          | ${Error('Invalid Path: c')}
      ${{ StringGreaterThanPath: '$.b', Variable: '$.a'}}                        |  ${{ a: 'c', b: 'd' }}                  | ${false}
      ${{ StringGreaterThanPath: '$.a', Variable: '$.b'}}                        |  ${{ a: 'c', b: 'e' }}                  | ${true}
      ${{ StringGreaterThanPath: '$.b', Variable: '$.a'}}                        |  ${{ a: 'cd', b: 'c' }}                 | ${true}
      ${{ StringGreaterThanEquals: 'c', Variable: '$.a'}}                        |  ${{ a: 'c', b: 'c' }}                  | ${true}
      ${{ StringMatches: 'what*up', Variable: '$.a'}}                            |  ${{ a: 'what is going on up' }}        | ${true}
      ${{ StringMatches: '*.zip', Variable: '$.a'}}                              |  ${{ a: 'frofro.zip' }}                 | ${true}
      ${{ StringMatches: '*.zip', Variable: '$.a'}}                              |  ${{ a: 'frofro.js' }}                  | ${false}
      ${{ IsNull: true, Variable: '$.a'}}                                        |  ${{ a: null }}                         | ${true}
      ${{ IsNull: true, Variable: '$.a'}}                                        |  ${{}}                                  | ${Error('Invalid Path: $.a')}
      ${{ IsNull: false, Variable: '$.a'}}                                       |  ${{}}                                  | ${Error('Invalid Path: $.a')}
      ${{ IsNull: false, Variable: '$.a'}}                                       |  ${{ a: 'bloom'}}                       | ${true}
      ${{ IsPresent: false, Variable: '$.a'}}                                    |  ${{ }}                                 | ${true}
      ${{ IsPresent: true, Variable: '$.a'}}                                     |  ${{ }}                                 | ${false}
      ${{ IsPresent: true, Variable: '$.a'}}                                     |  ${{ a: 'dwq' }}                        | ${true}
      ${{ IsPresent: false, Variable: '$.a'}}                                    |  ${{ a: 'dwq' }}                        | ${false}
      ${{ IsString: true, Variable: '$.a'}}                                      |  ${{ a: 'dwq' }}                        | ${true}
      ${{ IsString: false, Variable: '$.a'}}                                     |  ${{ a: 'dwq' }}                        | ${false}
      ${{ IsNumeric: true, Variable: '$.a'}}                                     |  ${{ a: 'dwq' }}                        | ${false}
      ${{ IsNumeric: true, Variable: '$.a'}}                                     |  ${{ a: 3 }}                            | ${true}
      ${{ IsNumeric: false, Variable: '$.a'}}                                    |  ${{ a: 3 }}                            | ${false}
      ${{ IsNumeric: false, Variable: '$.a'}}                                    |  ${{ a: 'dwq' }}                        | ${true}
      ${{ IsBoolean: true, Variable: '$.a'}}                                     |  ${{ a: true }}                         | ${true}
      ${{ IsBoolean: true, Variable: '$.a'}}                                     |  ${{ a: false }}                        | ${true}
      ${{ IsBoolean: false, Variable: '$.a'}}                                    |  ${{ a: true }}                         | ${false}
      ${{ IsBoolean: true, Variable: '$.a'}}                                     |  ${{ a: 'dwq' }}                        | ${false}
      ${{ IsTimestamp: true, Variable: '$.a'}}                                   |  ${{ a: 'dwq' }}                        | ${false}
      ${{ IsTimestamp: false, Variable: '$.a'}}                                  |  ${{ a: 'dwq' }}                        | ${true}
      ${{ IsTimestamp: true, Variable: '$.a'}}                                   |  ${{ a: '2020-10-10' }}                 | ${false}
      ${{ IsTimestamp: false, Variable: '$.a'}}                                  |  ${{ a: '2020-10-10' }}                 | ${true}
      ${{ IsTimestamp: true, Variable: '$.a'}}                                   |  ${{ a: '2016-04-06T10:10:09Z' }}       | ${true}
      ${{ TimestampGreaterThan: '2016-04-06T10:10:09Z', Variable: '$.a'}}        |  ${{ a: '2020-04-06T10:10:09Z' }}       | ${true}
    `('$args with $input produces $expected ', ({ args, input, expected }) => {
      if (expected.constructor === Error) {
        expect(() => { S.prototype.evaluateLogicalOperator(args, input)})
          .toThrowError(expected.message)
      } else  {
        expect(S.prototype.evaluateLogicalOperator(args, input)).toEqual(expected)
      }
    })
  })

  describe('runTask', () => {
    describe.skip('when Catch is defined', () => {
      test.each`
        ErrorEquals            | ResultPath       | error                        | success
        ${['MyError']}         | ${undefined}     | ${undefined}                 | ${true}
        ${[ErrorCodes.All]}    | ${undefined}     | ${new Error('Some Error')}   | ${true}
        ${['MyError']}         | ${'$.err'}       | ${new MyError('💥')}         | ${true}
        ${['MyError']}         | ${undefined}     | ${new Error('Some Error')}   | ${false}
      `(`as $Catch and the task throws with $error the task gets caught and succeeds: $success`, async ({
        ErrorEquals,
        error,
        success
      }) => {

        const resolveTask = jest.fn()
        const sm = new S({
          StartAt: 'one',
          States: {
            one: {
              Type: 'Task',
              Resource: 'someresource',
              Catch: [{
                ErrorEquals,
                ResultPath: "$",
                Next: 'two'
              }],
              End: true
            },
            two: {
              Type: 'Pass',
              End: true
            }
          }
        }, { resolveTask })

        const task = sm.stateMachine.States.one as TaskState<any>

        const input = { hello: 'world'}

        if (error != undefined) {
          resolveTask.mockRejectedValueOnce(error)
        }
        resolveTask.mockResolvedValue(input)

        const run = async () => {
          const res = await sm.runTask(
            sm.stateMachine.States.one,
            input
          )
          console.log({ res })
          return res
        }

        if (success) {
          await expect(run()).resolves.toEqual(error || input)
        } else {
          await expect(run()).rejects.toThrowError(error)
        }
      })
    })

    describe('when Retry is defined', () => {
      test.each`
        MaxAttempts         | ErrorEquals                   | throws    | error                            | tries    | success
        ${undefined}        | ${[ErrorCodes.All]}           | ${3}      | ${new Error('Some Error')}       | ${2}     | ${false}
        ${undefined}        | ${[ErrorCodes.All]}           | ${1}      | ${new Error('Some Error')}       | ${2}     | ${true}
        ${2}                | ${[ErrorCodes.All]}           | ${2}      | ${new Error('Some Error')}       | ${3}     | ${true}
        ${4}                | ${[ErrorCodes.All]}           | ${4}      | ${new Error('Some Error')}       | ${5}     | ${true}
        ${3}                | ${[ErrorCodes.All]}           | ${4}      | ${new Error('Some Error')}       | ${4}     | ${false}
        ${4}                | ${['Something']}              | ${4}      | ${new Error('Some Error')}       | ${1}     | ${false}
        ${2}                | ${[ErrorCodes.TaskFailed]}    | ${2}      | ${new Error('Some Error')}       | ${3}     | ${true}
        ${2}                | ${['MyError']}                | ${2}      | ${new MyError('💥')}             | ${3}     | ${true}
        ${2}                | ${[ErrorCodes.All]}           | ${2}      | ${new MyError('💥')}             | ${3}     | ${true}
        ${2}                | ${[ErrorCodes.TaskFailed]}    | ${2}      | ${new MyError('💥')}             | ${3}     | ${true}
        ${2}                | ${['Bla']}                    | ${2}      | ${new MyError('💥')}             | ${1}     | ${false}
      `(`with { MaxAttempts: $MaxAttempts, ErrorEquals: $ErrorEquals } and the task throws $error $throws times
      the task gets retried $tries and succeeds: $success`, async ({
        MaxAttempts,
        ErrorEquals,
        throws,
        error,
        tries,
        success
      }) => {
        const resolveTask = jest.fn()
        s = s.clone({
          resolveTask
        })

        const task = s.stateMachine.States.one as TaskState<any>
        task.Retry = [{
          MaxAttempts,
          ErrorEquals
        }]

        const input = { hello: 'world'}

        for (let i = 0; i < throws; i++) {
          resolveTask.mockRejectedValueOnce(error)
        }
        resolveTask.mockResolvedValueOnce(input)


        const run = async () => {
          const res = await s.runTask(
            s.stateMachine.States.one,
            input
          )
          return res
        }

        if (success) {
          await expect(run()).resolves.toEqual(input)
        } else {
          await expect(run()).rejects.toThrowError(error)
        }

        await expect(resolveTask).toHaveBeenCalledTimes(tries)
      })
    })
  })

  describe('startExecution', () => {
    it('should work', async () => {
      const s1 = new S({
        StartAt: 'one',
        States: {
          one: {
            Type: 'Pass',
            Parameters: {
              msg: "States.Format('Hello {}', $.name)"
            },
            Next: 'two'
          },
          two: {
            Type: 'Pass',
            End: true
          }
        }
      })
      const result = await s1.execute({
        Id: 'hello',
        Input: {
          name: 'John'
        }
      })

      expect(result).toEqual({ msg: 'Hello John'})
    })


    test.each([
      [new S({
        "StartAt": "one",
        "States": {
          "one": {
            "Type": "Choice",
            "Choices": [
              {
                "IsTimestamp": true,
                "Variable": "$.a",
                "Next": "yes"
              }
            ],
            "Default": "no"
          },
          "yes": {
            "Type": "Pass",
            "Result": "yes",
            "End": true
          },
          "no": {
            "Type": "Pass",
            "Result": "no",
            "End": true
          }
        }
      }), 
      {
        "a": "2016-04-06T10:10:09Z"
      },
      "yes"],
      [new S({
        "StartAt": "one",
        "States": {
          "one": {
            "Type": "Choice",
            "Choices": [
              {
                "IsTimestamp": false,
                "Variable": "$.a",
                "Next": "yes"
              }
            ],
            "Default": "no"
          },
          "yes": {
            "Type": "Pass",
            "Result": "yes",
            "End": true
          },
          "no": {
            "Type": "Pass",
            "Result": "no",
            "End": true
          }
        }
      }), 
      {
        "a": "2016-04-06T10:10:09Z"
      },
      "no"],
      [new S({
        "StartAt": "one",
        "States": {
          "one": {
            "Type": "Pass",
            "Result": "Hello World",
            "ResultPath": "$.msg",
            "End": true
          },
        }
      }), 
      { "name": "John" },
      { "name": "John", msg: "Hello World" }],
      [new S({
        "StartAt": "one",
        "States": {
          "one": {
            "Type": "Pass",
            "Result": "Hello World",
            "ResultPath": "$.msg",
            "End": true
          },
        }
      }), 
      { "name": "John" },
      { "name": "John", msg: "Hello World" }],

    ])('statemachine %j with input %j matches output %j', async (s, Input, expected) => {
      const res = await s.execute({
        Id: 'one',
        Input
      })
       expect(res).toEqual(expected)
    })
  })
})
