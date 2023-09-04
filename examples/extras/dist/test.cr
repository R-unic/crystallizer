require "./runtime_lib/*"

private def doSomething(&action : Nil -> Nil) : Nil
    action.call(nil)
    return
end
doSomething do
    puts("hello!")
end