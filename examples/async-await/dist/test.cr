require "./runtime_lib/*"

def myAsyncFunction : MiniFuture(String)
    async! do
        return "Hello!"
    end
end
def main : MiniFuture(Nil)
    async! do
        myAsyncFunction.then do |res|
            puts(res)
        end
        return
    end
end
await main