require "./spec_helper"

describe "Global Functions" do
  describe "setTimeout" do
    it "should wait an appropriate amount of time before executing a callback" do
      before = Time.utc.to_unix_f
      setTimeout 3000 do
        after = Time.utc.to_unix_f
        (after - before).should be_close 3, delta: 0.0001
      end
    end
  end
end