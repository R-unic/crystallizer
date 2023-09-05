require "./runtime_lib/*"

begin
    puts("6969420")
rescue e
    raise Exception.new("FATAL!!! error")
ensure
    puts("done :)")
end