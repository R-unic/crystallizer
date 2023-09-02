require "./runtime_lib/*"

def sayHi : Nil
    puts("Hello!")
end
puts("Code executed.")
set_timeout(3000) { sayHi() }