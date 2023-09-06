require "./runtime_lib/*"

nums : TsArray(Int8) = TsArray(Int8).new([1, 2, 3, 4, 5, 6] of Int8)
sum = nums.reduce do |total, n|
    total + n
end
puts(sum)