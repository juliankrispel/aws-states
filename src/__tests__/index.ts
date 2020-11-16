import S from '../'

describe('States', () => {
  let s = new S({
    StartAt: 'one',
    States: {
      one: {
        Type: 'Task',
        Resource: 'MyResource',
        End: true
      }
    }
  })

  it('instantiates a valid state machine', () => {
    expect(s.stateMachine).toMatchSnapshot()
  })

  describe('assign resources', () => {
    s.assignResources({
      one: async () => {
        return {
          what: 'is going on'
        }
      }
    })
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

  fdescribe('evaluateLogicalOperator', () => {
    test.each`
      args                                                         |  input                            | expected
      ${{ StringEquals: 'a', Variable: '$.a'}}                     |  ${{ a: 'a' }}                    | ${true}
      ${{ StringEquals: 'a', Variable: '$.a'}}                     |  ${{ a: 'b' }}                    | ${false}
      ${{ StringEquals: '$.a', Variable: '$.a'}}                   |  ${{ a: '$.a' }}                  | ${true}
      ${{ StringEqualsPath: '$.a', Variable: '$.a'}}               |  ${{ a: 'b' }}                    | ${true}
      ${{ StringEqualsPath: '$.b', Variable: '$.a'}}               |  ${{ a: 'b', b: 'b' }}            | ${true}
      ${{ StringEqualsPath: '$.b', Variable: '$.a'}}               |  ${{ a: 'b', b: 'c' }}            | ${false}
      ${{ StringEqualsPath: 'b', Variable: '$.a'}}                 |  ${{ a: 'b', b: 'c' }}            | ${Error('Invalid Path: b')}
      ${{ StringGreaterThan: 'b', Variable: '$.a'}}                |  ${{ a: 'c' }}                    | ${true}
      ${{ StringGreaterThan: 'c', Variable: '$.a'}}                |  ${{ a: 'c' }}                    | ${false}
      ${{ StringGreaterThanPath: 'c', Variable: '$.a'}}            |  ${{ a: 'c' }}                    | ${Error('Invalid Path: c')}
      ${{ StringGreaterThanPath: '$.b', Variable: '$.a'}}          |  ${{ a: 'c', b: 'd' }}            | ${true}
      ${{ StringGreaterThanPath: '$.b', Variable: '$.a'}}          |  ${{ a: 'c', b: 'e' }}            | ${true}
      ${{ StringGreaterThanPath: '$.b', Variable: '$.a'}}          |  ${{ a: 'c', b: 'cd' }}           | ${true}
      ${{ StringGreaterThanEquals: '$.b', Variable: '$.a'}}        |  ${{ a: 'c', b: 'c' }}            | ${true}
      ${{ StringGreaterThanEquals: '$.b', Variable: '$.a'}}        |  ${{ a: 'cb', b: 'ca' }}          | ${false}
    `('$args with $input produces $expected ', ({ args, input, expected }) => {
      if (expected.constructor === Error) {
        expect(() => { S.prototype.evaluateLogicalOperator(args, input)})
          .toThrowError(expected.message)
      } else  {
        expect(S.prototype.evaluateLogicalOperator(args, input)).toEqual(expected)
      }
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
      const result = await s1.startExecution({
        name: 'John'
      })

      expect(result).toEqual({ msg: 'Hello John'})
    })
  })
})
