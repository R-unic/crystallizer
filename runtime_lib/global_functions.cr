require "schedule"

def set_timeout(delay : Number, &) : Nil
  Schedule.after(delay.milliseconds) { yield }
end

def set_interval(delay : Number, &) : Nil
  Schedule.every(delay.milliseconds) { yield }
end