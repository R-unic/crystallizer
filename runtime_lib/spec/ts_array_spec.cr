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
  describe "#filter" do
    it "filters an array" do
      arr = TsArray(Int32).new([1, 2, 3, 4, 5, 6, 7, 8] of Int32)
        .filter { |n| n % 2 == 0 }

      arr.length.should eq 4
      arr.first.should eq 2
      arr.last.should eq 8
    end
  end
  describe "#sort" do
    it "sorts an array" do
      arr = TsArray(Int32).new([5, 2, 9, 8, 13, 4, 7, 12] of Int32)
        .sort { |a, b| a > b ? 1 : -1 }

      arr.length.should eq 8
      arr.first.should eq 2
      arr.last.should eq 13
    end
  end
  describe "#every" do
    it "checks if every element of an array matches the predicate" do
      matches = TsArray(Int32).new([11, 53, 19, 28] of Int32)
        .every { |n| n > 10 }

      matches.should be_true
    end
  end
  describe "#some" do
    it "checks if some elements of an array match the predicate" do
      matches = TsArray(Int32).new([6, 2, 5] of Int32)
        .some { |n| n > 5 }

      matches.should be_true
    end
  end
  describe "#reduce" do
    it "reduces an array to a cumulative form" do
      sum = TsArray(Int32).new([5, 7, 2, 3, 10] of Int32)
        .reduce { |total, n| total + n }

      sum.should eq 27
    end
  end
end