class TsArray(T)
  def initialize(@cache : Array(T) = [] of T)
  end

  # TODO: filter, find, reduce, remove, indexOf, etc.
  def [](index : Int) : T
    @cache[index]
  end

  def for_each(&) : Nil
    @cache.each do |item|
      yield item
    end
  end

  def length : UInt32
    @cache.size.to_u32
  end
end

