export function damp(value: number, target: number, dt: number, timeConstant: number): number {
  return value + (target - value) * (1 - Math.exp(-dt / timeConstant));
}

export class Dampener {
  private value: number;
  private speed: number;

  constructor(initialValue: number = 0, speed: number = 10.0) {
    this.value = initialValue;
    this.speed = speed;
  }

  public update(target: number, dt: number): number {
    this.value = damp(this.value, target, dt, 1 / this.speed);
    return this.value;
  }

  public getValue(): number {
    return this.value;
  }
}
