require "./runtime_lib/*"

class A
    def methodA : Nil
        puts("Hello from A!")
        return
    end
end
class B < A
    def methodB : Nil
        puts("Hello from B!")
        return
    end
end
b = B.new
b.methodA
b.methodB
puts(b.class < B)
puts(b.class < A)