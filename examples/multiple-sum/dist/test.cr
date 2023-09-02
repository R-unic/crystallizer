require "../runtime_lib/*"

nums : TsArray(Int32) = TsArray(Int32).new([1, 2, 3] of Int32)
nums.for_each do |n|
    puts(n)
end