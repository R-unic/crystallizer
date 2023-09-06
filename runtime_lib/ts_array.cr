class TsArray(T)
  def initialize(@cache : Array(T) = [] of T)
  end

  def self.of(*values : U) forall U
    TsArray(U).new([*values] of U)
  end

  def [](index : Int) : T
    @cache[index]
  end

  def forEach(&) : Nil
    @cache.each_with_index do |v, i|
      yield v, i
    end
  end

  def length : Int
    @cache.size
  end

  def includes(value : T) : Bool
    @cache.includes?(value)
  end


  def push(*values : T) : Int
    index = length
    @cache.push(*values)
    index
  end

  def pop : T?
    @cache.pop?
  end

  def shift : T?
    @cache.shift?
  end

  def unshift(*values : T) : Int
    values.each do |value|
      @cache.insert(0, value)
    end
    length
  end

  def join(separator : String?) : String
    @cache.join(separator)
  end

  def indexOf(value : T, from_index : Int) : Int?
    @cache.index(value, from_index)
  end

  def lastIndexOf(value : T, from_index : Int) : Int?
    @cache.rindex(value, from_index)
  end

  def first : T
    @cache.first
  end

  def first? : T?
    @cache.first?
  end

  def last : T
    @cache.last
  end

  def last? : T?
    @cache.last?
  end

  def reverse : TsArray(T)
    TsArray(T).new(@cache.reverse)
  end

  def slice(start : Int?, finish : Int?) : TsArray(T)
    TsArray(T).new(@cache[(start || 0)..(finish || length - 1)])
  end

  def splice(start : Int, delete_count : Int?) : TsArray(T)
    old = @cache
    new = TsArray(T).new(@cache.truncate(start, delete_count || 1))
    old - new
  end

  def concat(*values : T) : TsArray(T)
    result = TsArray(T).new(@cache)
    result.push(*values)
    result
  end

  def concat(*arrays : Array(T)) : TsArray(T)
    result = TsArray(T).new(@cache)
    arrays.each do |array|
      array.each do |value|
        result.push(value)
      end
    end
    result
  end

  def every(&predicate : T, Int32 -> Bool) : Bool
    matches = true
    forEach do |v, i|
      matches &&= predicate.call(v, i)
    end
    matches
  end

  def some(&predicate : T, Int32 -> Bool) : Bool
    forEach do |v, i|
      return true if predicate.call(v, i)
    end
    false
  end

  def filter(&predicate : T, Int32 -> Bool) : TsArray(T)
    filtered = TsArray(T).new
    forEach do |v, i|
      filtered.push(v) if predicate.call(v, i)
    end
    filtered
  end

  def map(&transform : T, Int32 -> U) : TsArray(U) forall U
    mapped = TsArray(U).new
    forEach do |v, i|
      mapped.push(transform.call(v, i))
    end
    mapped
  end

  def sort(&sorter : T, T -> U) : TsArray(U) forall U
    TsArray(U).new(@cache.sort &sorter)
  end

  def find(&predicate : T, Int32 -> Bool) : T?
    filter(&predicate).first?
  end

  def fill(value : T, start : Int?, finish : Int?) : self
    @cache.fill(value, start, finish)
    self
  end

  def findIndex(&predicate : T, Int32 -> Bool) : Int?
    indexOf(find(&predicate))
  end

  def reduce(initial : U, &block : U, T -> U) : U forall U
    accumulator = initial
    forEach do |v|
      accumulator = block.call(accumulator, v)
    end
    accumulator
  end

  def reduce(&block : T, T -> T) : T
    reduce(first, &block)
  end

  def reduceRight(initial : U, &block : U, T -> U) : U forall U
    accumulator = initial
    reverse.forEach do |v|
      accumulator = block.call(accumulator, v)
    end
    accumulator
  end

  def reduceRight(&block : T, T -> T) : T
    reduceRight(last, &block)
  end
end