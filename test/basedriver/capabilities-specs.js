import { parseCaps, validateCaps, mergeCaps, processCapabilities } from '../../lib/basedriver/capabilities';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
chai.should();

describe('caps', function () {

  // Tests based on: https://www.w3.org/TR/webdriver/#dfn-validate-caps
  describe('#validateCaps', function () {
    it('returns invalid argument error if "capability" is not a JSON object (1)', function () {
      for (let arg of [undefined, null, 1, true, 'string']) {
        (function () { validateCaps(arg); }).should.throw(/must be a JSON object/);
      }
    });

    it('returns result {} by default if caps is empty object and no constraints provided (2)', function () {
      validateCaps({}).should.deep.equal({});
    });

    describe('throws errors if constraints are not met', function () {
      it('returns invalid argument error if "present" constraint not met on property', function () {
        (() => validateCaps({}, {foo: {presence: true}})).should.throw(/foo can't be blank/);
      });

      it('returns the capability that was passed in if "skipPresenceConstraint" is false', function () {
        validateCaps({}, {foo: {presence: true}}, true).should.deep.equal({});
      });

      it('returns invalid argument error if "isString" constraint not met on property', function () {
        (() => validateCaps({foo: 1}, {foo: {isString: true}})).should.throw(/foo must be of type string/);
      });

      it('returns invalid argument error if "isNumber" constraint not met on property', function () {
        (() => validateCaps({foo: 'bar'}, {foo: {isNumber: true}})).should.throw(/foo must be of type number/);
      });

      it('returns invalid argument error if "isBoolean" constraint not met on property', function () {
        (() => validateCaps({foo: 'bar'}, {foo: {isBoolean: true}})).should.throw(/foo must be of type boolean/);
      });

      it('returns invalid argument error if "inclusion" constraint not met on property', function () {
        (() => validateCaps({foo: '3'}, {foo: {inclusionCaseInsensitive: ['1', '2']}})).should.throw(/foo 3 not part of 1,2./);
      });

      it('returns invalid argument error if "inclusionCaseInsensitive" constraint not met on property', function () {
        (() => validateCaps({foo: 'a'}, {foo: {inclusion: ['A', 'B', 'C']}})).should.throw(/foo a is not included in the list/);
      });
    });

    it('should not throw errors if constraints are met', function () {
      let caps = {
        number: 1,
        string: 'string',
        present: 'present',
        extra: 'extra',
      };

      let constraints = {
        number: {isNumber: true},
        string: {isString: true},
        present: {presence: true},
        notPresent: {presence: false},
      };

      validateCaps(caps, constraints).should.deep.equal(caps);
    });
  });

  // Tests based on: https://www.w3.org/TR/webdriver/#dfn-merging-caps
  describe('#mergeCaps', function () {
    it('returns a result that is {} by default (1)', function () {
      mergeCaps().should.deep.equal({});
    });

    it('returns a result that matches primary by default (2, 3)', function () {
      mergeCaps({hello: 'world'}).should.deep.equal({hello: 'world'});
    });

    it('returns invalid argument error if primary and secondary have matching properties (4)', function () {
      (() => mergeCaps({hello: 'world'}, {hello: 'whirl'})).should.throw(/property hello should not exist on both primary and secondary/);
    });

    it('returns a result with keys from primary and secondary together', function () {
      let primary = {
        a: 'a',
        b: 'b',
      };
      let secondary = {
        c: 'c',
        d: 'd',
      };
      mergeCaps(primary, secondary).should.deep.equal({
        a: 'a', b: 'b', c: 'c', d: 'd',
      });
    });
  });

  // Tests based on: https://www.w3.org/TR/webdriver/#dfn-matching-caps
  describe('#matchCaps', function () {
    // TODO: Do we need this?
  });

  // Tests based on: https://www.w3.org/TR/webdriver/#processing-caps
  describe('#parseCaps', function () {
    let caps;

    beforeEach(() => {
      caps = {};
    });

    it('should return invalid argument if no caps object provided', function () {
      (() => parseCaps()).should.throw(/must be a JSON object/);
    });

    it('sets "requiredCaps" to property named "alwaysMatch" (2)', function () {
      caps.alwaysMatch = {hello: 'world'};
      parseCaps(caps).requiredCaps.should.deep.equal(caps.alwaysMatch);
    });

    it('sets "requiredCaps" to empty JSON object if "alwaysMatch" is not an object (2.1)', function () {
      parseCaps(caps).requiredCaps.should.deep.equal({});
    });

    it('returns invalid argument error if "requiredCaps" don\'t match "constraints" (2.2)', function () {
      caps.alwaysMatch = {foo: 1};
      (() => parseCaps(caps, {foo: {isString: true}})).should.throw(/foo must be of type string/);
    });

    it('sets "allFirstMatchCaps" to property named "firstMatch" (3)', function () {
      parseCaps({}, []).allFirstMatchCaps.should.deep.equal([]);
    });

    it('sets "allFirstMatchCaps" to [] if "firstMatch" is undefined (3.1)', function () {
      parseCaps({}).allFirstMatchCaps.should.deep.equal([]);
    });

    it('returns invalid argument error if "firstMatch" is not an array and is not undefined (3.2)', function () {
      for (let arg of [null, 1, true, 'string']) {
        caps.firstMatch = arg;
        (function () { parseCaps(caps); }).should.throw(/must be a JSON array or undefined/);
      }
    });

    it('has "validatedFirstMatchCaps" property that is [] by default (4)', function () {
      parseCaps(caps).validatedFirstMatchCaps.should.deep.equal([]);
    });

    describe('returns a "validatedFirstMatchCaps" array (5)', function () {
      it('that equals "firstMatch" if firstMatch is one empty object and there are no constraints', function () {
        caps.firstMatch = [{}];
        parseCaps(caps).validatedFirstMatchCaps.should.deep.equal(caps.firstMatch);
      });

      it('returns invalid argument error if firstMatch array\'s first argument fails constraints', function () {
        caps.firstMatch = [{}];
        (() => parseCaps(caps, {foo: {presence: true}})).should.throw(/foo can't be blank/);
      });

      it('that equals firstMatch if firstMatch contains two objects that pass the provided constraints', function () {
        caps.alwaysMatch = {
          foo: 'bar'
        };
        caps.firstMatch = [
          {foo: 'bar1'},
          {foo: 'bar2'},
        ];

        let constraints = {
          foo: {
            presence: true,
            isString: true,
          }
        };

        parseCaps(caps, constraints).validatedFirstMatchCaps.should.deep.equal(caps.firstMatch);
      });

      it('returns invalid argument error if the firstMatch[2] is not an object', function () {
        caps.firstMatch = [{foo: 'bar'}, 'foo'];
        (() => parseCaps(caps, {})).should.throw(/must be a JSON object/);
      });
    });

    describe('returns a matchedCaps object (6)', function () {
      beforeEach(() => {
        caps.alwaysMatch = {hello: 'world'};
      });

      it('which is same as alwaysMatch if firstMatch array is not provided', function () {
        parseCaps(caps).matchedCaps.should.deep.equal({hello: 'world'});
      });

      it('merges caps together', function () {
        caps.firstMatch = [{foo: 'bar'}];
        parseCaps(caps).matchedCaps.should.deep.equal({hello: 'world', foo: 'bar'});
      });

      it('with merged caps', function () {
        caps.firstMatch = [{hello: 'bar', foo: 'foo'}, {foo: 'bar'}];
        parseCaps(caps).matchedCaps.should.deep.equal({hello: 'world', foo: 'bar'});
      });
    });
  });

  describe('#processCaps', function () {
    it('should return "alwaysMatch" if "firstMatch" and "constraints" were not provided', function () {
      processCapabilities({}).should.deep.equal({});
    });

    it('should return merged caps', function () {
      processCapabilities({
        alwaysMatch: {hello: 'world'},
        firstMatch: [{foo: 'bar'}]
      }).should.deep.equal({hello: 'world', foo: 'bar'});
    });

    it('should strip out the "appium:" prefix for non-standard capabilities', function () {
      processCapabilities({
        alwaysMatch: {'appium:hello': 'world'},
        firstMatch: [{'appium:foo': 'bar'}]
      }).should.deep.equal({hello: 'world', foo: 'bar'});
    });

    it('should throw an exception if a standard capability (https://www.w3.org/TR/webdriver/#dfn-table-of-standard-capabilities) is prefixed', function () {
      (() => processCapabilities({
        alwaysMatch: {'appium:platformName': 'Whatevz'},
        firstMatch: [{'appium:browserName': 'Anything'}],
      })).should.throw(/standard capabilities/);
    });
  });
});
