require "schedule"

def setTimeout(delay : Number, &block) : Nil
  future = Schedule.after(delay.milliseconds) do
    block.call
  end
  until future.completed?
    Fiber.yield
  end
end

def setInterval(delay : Number, &block) : Nil
  future = Schedule.every(delay.milliseconds) { block.call }
  until future.completed?
    Fiber.yield
  end
end

def parseInt(string : String) : Int
  string.to_i
end

def parseFloat(string : String) : Float
  string.to_f
end