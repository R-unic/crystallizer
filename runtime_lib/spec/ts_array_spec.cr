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
    it "sorts an array based on a predicate" do
      arr = TsArray(Int32).new([5, 2, 9, 8, 13, 4, 7, 12] of Int32)
        .sort { |a, b| a > b }

      arr.length.should eq 8
      arr.__cache.should eq [2, 4, 5, 7, 8, 9, 12, 13]
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
  describe "#reduceRight" do
    it "reduces an array to a cumulative form from the right" do
      difference = TsArray(Int32).new([2, 3, 10] of Int32)
        .reduceRight { |total, n| total - n }

        difference.should eq 5
    end
  end
  describe "#find" do
    it "finds an element that matches a predicate" do
      db = TsArray(String).new(["a.c", "b.d", "d.b"] of String)
        .find &.ends_with?("b")

      db.should eq "d.b"
    end
  end
  describe "#findIndex" do
    it "finds the index of an element that matches a predicate" do
      index = TsArray(String).new(["a.c", "b.d", "d.b"] of String)
        .findIndex &.ends_with?("b")

      index.should eq 2
    end
  end
  describe "#concat" do
    it "concatenates multiple arrays in order" do
      combined = TsArray(Int32).new([1, 2] of Int32)
        .concat(
          TsArray(Int32).new([3, 4] of Int32),
          TsArray(Int32).new([5, 6] of Int32),
          TsArray(Int32).new([7, 8] of Int32)
        )

      combined.__cache.should eq [1, 2, 3, 4, 5, 6, 7, 8]
    end
  end
  describe "#indexOf" do
    it "finds the index of an exact element" do
      index = TsArray(Int32).new([1, 2, 3] of Int32).indexOf(2)
      index.should eq 1
    end
  end
  describe "#lastIndexOf" do
    it "finds the index of an exact element from the right" do
      index = TsArray(Int32).new([1, 2, 3, 2, 1] of Int32).lastIndexOf(2)
      index.should eq 3
    end
  end
  describe "#join" do
    it "joins an array together with a separator" do
      string = TsArray(String).new(["a", "b", "c"] of String).join(":")
      string.should eq "a:b:c"
    end
  end
  describe "#unshift" do
    it "prepends elements to an array" do
      arr = TsArray(String).new(["c"] of String)
      arr.unshift("a", "b")
      arr.__cache.should eq ["a", "b", "c"]
    end
  end
  describe "#shift" do
    it "removes elements from the beginning of an array" do
      arr = TsArray(String).new(["a", "b", "c"] of String)
      arr.shift
      arr.shift
      arr.length.should eq 1
      arr.first.should eq "c"
      arr.last.should eq "c"
    end
  end
  describe "#pop" do
    it "removes elements from the end of an array" do
      arr = TsArray(String).new(["a", "b", "c"] of String)
      arr.pop
      arr.pop
      arr.length.should eq 1
      arr.first.should eq "a"
      arr.last.should eq "a"
    end
  end
  describe "#includes" do
    it "returns whether or not an array includes an element" do
      has_element = TsArray(String).new(["a", "b", "c"] of String).includes("b")
      has_element.should be_true
    end
  end
  describe "#to_s" do
    it "should return the internal array's string representation" do
      string = TsArray(Int32).new([1, 2, 3, 4] of Int32).to_s
      string.should eq "[1, 2, 3, 4]"
    end
  end
end