import { describe, expect, it } from 'vitest';
import { explain, position, solve, trajectory, validate } from './physics';

describe('projectile motion', () => {
  it('matches textbook results from ground level', () => {
    const r = solve({ v: 20, angle: 45, g: 9.81, h: 0 });
    expect(r.range).toBeCloseTo((20 * 20) / 9.81, 6); // v²/g at 45°
    expect(r.maxHeight).toBeCloseTo((20 * 20 * 0.5) / (2 * 9.81), 6);
    expect(r.flightTime).toBeCloseTo((2 * 20 * Math.SQRT1_2) / 9.81, 6);
    expect(r.impactSpeed).toBeCloseTo(20, 6);
    expect(r.impactAngle).toBeCloseTo(45, 6);
  });
  it('gives equal ranges for complementary angles', () => {
    expect(solve({ v: 15, angle: 30, g: 9.81, h: 0 }).range).toBeCloseTo(solve({ v: 15, angle: 60, g: 9.81, h: 0 }).range, 6);
  });
  it('handles a launch from height, including horizontal', () => {
    const r = solve({ v: 10, angle: 0, g: 10, h: 20 });
    expect(r.flightTime).toBeCloseTo(2, 6);
    expect(r.range).toBeCloseTo(20, 6);
    expect(r.maxHeight).toBe(20);
    expect(r.apexTime).toBe(0);
  });
  it('produces positions and a trajectory ending on the ground', () => {
    const l = { v: 20, angle: 60, g: 9.81, h: 0 };
    const t = trajectory(l, 40);
    expect(t[0]).toEqual({ x: 0, y: 0 });
    expect(t[40].y).toBeCloseTo(0, 6);
    expect(position(l, 999).x).toBeCloseTo(solve(l).range, 6);
  });
  it('validates inputs and explains results', () => {
    expect(validate({ v: '0', angle: '95', g: 'x', h: '10' })).toEqual({ v: expect.any(String), angle: expect.any(String), g: expect.any(String) });
    expect(validate({ v: '10', angle: '0', g: '9.81', h: '0' }).h).toMatch(/never leaves/);
    const l = { v: 20, angle: 45, g: 1.62, h: 0 };
    expect(explain(l, solve(l), 'the Moon').join(' ')).toMatch(/on the Moon/);
  });
});
