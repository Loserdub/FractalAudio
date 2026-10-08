export class Dampener {
  private value: number;
  private speed: number;

  constructor(initialValue: number = 0, speed: number = 10.0) {
    this.value = initialValue;
    this.speed = speed;
  }

  public update(target: number, dt: number): number {
    const alpha = 1.0 - Math.exp(-this.speed * dt);
    this.value += (target - this.value) * alpha;
    return this.value;
  }

  public getValue(): number {
    return this.value;
  }
}
