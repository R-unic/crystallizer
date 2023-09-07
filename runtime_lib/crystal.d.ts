type i8 = number;
type u8 = number;
type i16 = number;
type u16 = number;
type i32 = number;
type f32 = number;
type u32 = number;
type i64 = number;
type f64 = number;
type u64 = number;
type i128 = number;
type u128 = number;

interface Array<T> {
  readonly __cache: unknown;
  first(): T;
  last(): T;
}

interface Number {
  floor(): number;
  ceil(): number;
}