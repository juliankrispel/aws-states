import S from '../'

describe('States', () => {
  const s = new S({
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
    expect(s).toMatchSnapshot()
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
      ${'msg'}                    | ${{msg: 'Hello World'}}                 | ${Error('Invalid Path: msg')}
      ${'$.a.b'}                  | ${{a: 'a'}}                           | ${Error('Invalid Path: $.a.b')}
      ${'$.a.b'}                  | ${{a: { b: 'c'}}}                     | ${'c'}
      ${'$.a[0]'}                 | ${{a: [1,2,3]}}                       | ${1}
      ${'$.a[0]'}                 | ${{a: { b: 1 }}}                      | ${Error('Invalid Path: $.a[0]')}
      ${'$.a[0].b'}               | ${{a: [{ b: 1 }]}}                    | ${1}
      ${'$.a[0:1]'}               | ${{a: [1,2,3]}}                       | ${[1, 2]}
    `(`path("$path", $input) matches $expected`, ({ path, input, expected }) => {
      // console.log({
      //   path, input, expected
      // })
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
})
