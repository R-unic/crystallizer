require "schedule"

def set_timeout(delay : Number, &block) : Nil
  future = Schedule.after(delay.milliseconds) do
    block.call
  end
  until future.completed?
    Fiber.yield
  end
end

def set_interval(delay : Number, &block) : Nil
  future = Schedule.every(delay.milliseconds) { block.call }
  until future.completed?
    Fiber.yield
  end
end