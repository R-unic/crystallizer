require "./spec_helper"

describe TsArray do
  describe "#map" do
    it "maps an array of T to another array of T" do
      arr = TsArray(Int32).new([1, 2, 3, 4] of Int32)
        .map { |n| n * 2 }

      arr.length.should eq 4
      arr.first.should eq 2
      arr.last.should eq 8
    end
    it "maps an array of T to an array of U" do
      arr = TsArray(Int32).new([1, 2, 3, 4] of Int32)
        .map &.to_s

      arr.length.should eq 4
      arr.first.should eq "1"
      arr.last.should eq "4"
    end
  end
end