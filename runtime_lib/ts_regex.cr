class TsRegex
  def initialize(@internal : Regex)
  end

  def test(body : String | TsRegex) : Bool
    !!(@internal =~ body)
  end

  def =~(other : String | TsRegex) : Int32?
    @internal =~ other
  end
end