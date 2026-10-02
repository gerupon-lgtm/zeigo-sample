import test from 'node:test';
import assert from 'node:assert/strict';
import { getFoundingInfo, isFoundingDate } from '../src/founding.ts';

test('unknown founding day uses calendar year and shows 47 years in 2026', () => {
  assert.equal(getFoundingInfo(1979, null, new Date('2026-10-03T00:00:00Z')).label, '今年で47年。');
});
test('year changes at midnight in Japan, even while UTC is still in December', () => {
  assert.equal(getFoundingInfo(1979, null, new Date('2026-12-31T14:59:59Z')).years, 47);
  assert.equal(getFoundingInfo(1979, null, new Date('2026-12-31T15:00:00Z')).years, 48);
});
test('confirmed founding day increments only on the anniversary in Japan', () => {
  assert.equal(getFoundingInfo(1979, '1979-11-01', new Date('2026-10-31T14:59:59Z')).label, '創業46周年。');
  assert.equal(getFoundingInfo(1979, '1979-11-01', new Date('2026-10-31T15:00:00Z')).label, '創業47周年。');
});
test('invalid calendar dates and inconsistent founding years are rejected', () => {
  assert.equal(isFoundingDate('1979-02-29', 1979), false);
  assert.equal(isFoundingDate('1979-13-01', 1979), false);
  assert.equal(isFoundingDate('1980-01-01', 1979), false);
  assert.equal(isFoundingDate('1980-02-29', 1980), true);
});
test('invalid or missing date never invents an anniversary day', () => {
  const result = getFoundingInfo(1979, '1979-02-29', new Date('2027-01-01T00:00:00Z'));
  assert.equal(result.exact, false);
  assert.equal(result.label, '今年で48年。');
});
