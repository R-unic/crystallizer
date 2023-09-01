# TODO: use Fiber (basically a coroutine) to make a promise

class Promise(T)
  @success : Bool
  @result : T
  @fiber : Fiber

  def initialize(&)
    @fiber = Fiber.new "PromiseFiber" do
      yield
    end
  end

  def resolve(result : T) : Nil
    @success = true
    @result = result
  end

  def reject(message : String) : T
    @success = false
    @result = Exception.new("Promise rejected: #{message}")
  end

  def await : T
    running = Fiber.current
    self.then do
      running.resume
    end
    @fiber.yield
  end
end