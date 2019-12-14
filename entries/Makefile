OUT_DIR=../public/p/
# Using GNU Make-specific functions here
FILES=$(patsubst %.org,$(OUT_DIR)/%.html,$(wildcard *.org))

.PHONY: all clean install-doc

all: install-doc

install-doc: $(OUT_DIR) $(FILES)

$(OUT_DIR):
	mkdir -v -p $(OUT_DIR)

%.html: %.org
	org2html $<


$(OUT_DIR)/%.html: %.html
	install -v -m 644 -t $(OUT_DIR) $<
	rm $<

clean:
	rm *.html
