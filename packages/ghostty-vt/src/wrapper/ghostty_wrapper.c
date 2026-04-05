#include <ghostty/vt.h>
#include <stdint.h>
#include <stdlib.h>

GHOSTTY_API int ghostty_wrapper_terminal_new(
    uint16_t cols,
    uint16_t rows,
    size_t max_scrollback,
    GhosttyTerminal* out_terminal) {
    GhosttyTerminalOptions opts = {
        .cols = cols,
        .rows = rows,
        .max_scrollback = max_scrollback,
    };
    return ghostty_terminal_new(NULL, out_terminal, opts);
}

GHOSTTY_API void ghostty_wrapper_terminal_free(GhosttyTerminal terminal) {
    ghostty_terminal_free(terminal);
}

GHOSTTY_API void ghostty_wrapper_terminal_write(
    GhosttyTerminal terminal,
    const uint8_t* data,
    size_t len) {
    ghostty_terminal_vt_write(terminal, data, len);
}

GHOSTTY_API int ghostty_wrapper_terminal_resize(
    GhosttyTerminal terminal,
    uint16_t cols,
    uint16_t rows) {
    return ghostty_terminal_resize(terminal, cols, rows, 10, 20);
}

GHOSTTY_API int ghostty_wrapper_formatter_new(
    GhosttyTerminal terminal,
    GhosttyFormatter* out_formatter) {
    GhosttyFormatterTerminalOptions opts = {0};
    opts.size = sizeof(GhosttyFormatterTerminalOptions);
    opts.emit = GHOSTTY_FORMATTER_FORMAT_PLAIN;
    opts.trim = true;
    return ghostty_formatter_terminal_new(NULL, out_formatter, terminal, opts);
}

GHOSTTY_API void ghostty_wrapper_formatter_free(GhosttyFormatter formatter) {
    ghostty_formatter_free(formatter);
}

GHOSTTY_API int ghostty_wrapper_formatter_format(
    GhosttyFormatter formatter,
    uint8_t** out_ptr,
    size_t* out_len) {
    return ghostty_formatter_format_alloc(formatter, NULL, out_ptr, out_len);
}

GHOSTTY_API void ghostty_wrapper_free(void* ptr, size_t len) {
    ghostty_free(NULL, ptr, len);
}

GHOSTTY_API int ghostty_wrapper_mouse_encoder_new(GhosttyMouseEncoder* out_encoder) {
    return ghostty_mouse_encoder_new(NULL, out_encoder);
}

GHOSTTY_API void ghostty_wrapper_mouse_encoder_free(GhosttyMouseEncoder encoder) {
    ghostty_mouse_encoder_free(encoder);
}

GHOSTTY_API void ghostty_wrapper_mouse_encoder_set_format(
    GhosttyMouseEncoder encoder,
    int format) {
    GhosttyMouseFormat fmt = (GhosttyMouseFormat)format;
    ghostty_mouse_encoder_setopt(encoder, GHOSTTY_MOUSE_ENCODER_OPT_FORMAT, &fmt);
}

GHOSTTY_API void ghostty_wrapper_mouse_encoder_set_tracking(
    GhosttyMouseEncoder encoder,
    int tracking) {
    GhosttyMouseTrackingMode mode = (GhosttyMouseTrackingMode)tracking;
    ghostty_mouse_encoder_setopt(encoder, GHOSTTY_MOUSE_ENCODER_OPT_EVENT, &mode);
}

GHOSTTY_API void ghostty_wrapper_mouse_encoder_set_size(
    GhosttyMouseEncoder encoder,
    uint32_t screen_width,
    uint32_t screen_height,
    uint32_t cell_width,
    uint32_t cell_height) {
    GhosttyMouseEncoderSize size = {0};
    size.size = sizeof(GhosttyMouseEncoderSize);
    size.screen_width = screen_width;
    size.screen_height = screen_height;
    size.cell_width = cell_width;
    size.cell_height = cell_height;
    ghostty_mouse_encoder_setopt(encoder, GHOSTTY_MOUSE_ENCODER_OPT_SIZE, &size);
}

GHOSTTY_API int ghostty_wrapper_mouse_event_new(GhosttyMouseEvent* out_event) {
    return ghostty_mouse_event_new(NULL, out_event);
}

GHOSTTY_API void ghostty_wrapper_mouse_event_free(GhosttyMouseEvent event) {
    ghostty_mouse_event_free(event);
}

GHOSTTY_API void ghostty_wrapper_mouse_event_set_action(
    GhosttyMouseEvent event,
    int action) {
    ghostty_mouse_event_set_action(event, (GhosttyMouseAction)action);
}

GHOSTTY_API void ghostty_wrapper_mouse_event_set_button(
    GhosttyMouseEvent event,
    int button) {
    ghostty_mouse_event_set_button(event, (GhosttyMouseButton)button);
}

GHOSTTY_API void ghostty_wrapper_mouse_event_set_mods(
    GhosttyMouseEvent event,
    uint8_t mods) {
    ghostty_mouse_event_set_mods(event, (GhosttyMods)mods);
}

GHOSTTY_API void ghostty_wrapper_mouse_event_set_position(
    GhosttyMouseEvent event,
    float x,
    float y) {
    GhosttyMousePosition pos = {x, y};
    ghostty_mouse_event_set_position(event, pos);
}

GHOSTTY_API int ghostty_wrapper_mouse_encode(
    GhosttyMouseEncoder encoder,
    GhosttyMouseEvent event,
    char* buf,
    size_t buf_size,
    size_t* out_len) {
    return ghostty_mouse_encoder_encode(encoder, event, buf, buf_size, out_len);
}

GHOSTTY_API int ghostty_wrapper_grid_ref(
    GhosttyTerminal terminal,
    uint16_t col,
    uint16_t row,
    void* out_ref) {
    GhosttyGridRef* ref = (GhosttyGridRef*)out_ref;
    ref->size = sizeof(GhosttyGridRef);
    ref->node = NULL;
    ref->x = col;
    ref->y = row;
    
    GhosttyPoint pt = {
        .tag = GHOSTTY_POINT_TAG_ACTIVE,
        .value = { .coordinate = { .x = col, .y = row } },
    };
    
    return ghostty_terminal_grid_ref(terminal, pt, ref);
}

GHOSTTY_API int ghostty_wrapper_cell_get_codepoint(void* ref, uint32_t* out_codepoint) {
    GhosttyCell cell;
    GhosttyResult result = ghostty_grid_ref_cell((GhosttyGridRef*)ref, &cell);
    if (result != GHOSTTY_SUCCESS) return result;
    
    return ghostty_cell_get(cell, GHOSTTY_CELL_DATA_CODEPOINT, out_codepoint);
}

GHOSTTY_API int ghostty_wrapper_cell_get_has_text(void* ref, bool* out_has_text) {
    GhosttyCell cell;
    GhosttyResult result = ghostty_grid_ref_cell((GhosttyGridRef*)ref, &cell);
    if (result != GHOSTTY_SUCCESS) return result;
    
    return ghostty_cell_get(cell, GHOSTTY_CELL_DATA_HAS_TEXT, out_has_text);
}

GHOSTTY_API int ghostty_wrapper_cell_get_wide(void* ref, int* out_wide) {
    GhosttyCell cell;
    GhosttyResult result = ghostty_grid_ref_cell((GhosttyGridRef*)ref, &cell);
    if (result != GHOSTTY_SUCCESS) return result;
    
    return ghostty_cell_get(cell, GHOSTTY_CELL_DATA_WIDE, out_wide);
}

GHOSTTY_API int ghostty_wrapper_cell_get_graphemes(void* ref, uint32_t* buf, size_t buf_len, size_t* out_len) {
    return ghostty_grid_ref_graphemes((GhosttyGridRef*)ref, buf, buf_len, out_len);
}

GHOSTTY_API int ghostty_wrapper_cell_style_flags(void* ref, uint8_t* out_flags) {
    GhosttyStyle style = {0};
    style.size = sizeof(GhosttyStyle);

    GhosttyResult result = ghostty_grid_ref_style((GhosttyGridRef*)ref, &style);
    if (result != GHOSTTY_SUCCESS) return result;

    uint8_t flags = 0;
    if (style.bold) flags |= 1 << 0;
    if (style.italic) flags |= 1 << 1;
    if (style.faint) flags |= 1 << 2;
    if (style.blink) flags |= 1 << 3;
    if (style.inverse) flags |= 1 << 4;
    if (style.invisible) flags |= 1 << 5;
    if (style.strikethrough) flags |= 1 << 6;
    if (style.overline) flags |= 1 << 7;

    *out_flags = flags;
    return GHOSTTY_SUCCESS;
}

GHOSTTY_API int ghostty_wrapper_cell_underline(void* ref, uint8_t* out_underline) {
    GhosttyStyle style = {0};
    style.size = sizeof(GhosttyStyle);

    GhosttyResult result = ghostty_grid_ref_style((GhosttyGridRef*)ref, &style);
    if (result != GHOSTTY_SUCCESS) return result;

    *out_underline = (uint8_t)style.underline;
    return GHOSTTY_SUCCESS;
}

GHOSTTY_API int ghostty_wrapper_cell_fg_color(void* ref, uint8_t* out_tag, uint8_t* out_palette) {
    GhosttyStyle style = {0};
    style.size = sizeof(GhosttyStyle);

    GhosttyResult result = ghostty_grid_ref_style((GhosttyGridRef*)ref, &style);
    if (result != GHOSTTY_SUCCESS) return result;

    *out_tag = (uint8_t)style.fg_color.tag;
    *out_palette = style.fg_color.value.palette;
    return GHOSTTY_SUCCESS;
}

GHOSTTY_API int ghostty_wrapper_cell_bg_color(void* ref, uint8_t* out_tag, uint8_t* out_palette) {
    GhosttyStyle style = {0};
    style.size = sizeof(GhosttyStyle);

    GhosttyResult result = ghostty_grid_ref_style((GhosttyGridRef*)ref, &style);
    if (result != GHOSTTY_SUCCESS) return result;

    *out_tag = (uint8_t)style.bg_color.tag;
    *out_palette = style.bg_color.value.palette;
    return GHOSTTY_SUCCESS;
}

GHOSTTY_API int ghostty_wrapper_terminal_mode_get(GhosttyTerminal terminal, uint16_t mode, bool* out_value) {
    return ghostty_terminal_mode_get(terminal, mode, out_value);
}

GHOSTTY_API int ghostty_wrapper_terminal_active_screen(GhosttyTerminal terminal, uint32_t* out_screen) {
    return ghostty_terminal_get(terminal, GHOSTTY_TERMINAL_DATA_ACTIVE_SCREEN, out_screen);
}

typedef struct {
    uint8_t fg_tag;
    uint8_t fg_palette;
    uint8_t fg_r;
    uint8_t fg_g;
    uint8_t fg_b;
    uint8_t bg_tag;
    uint8_t bg_palette;
    uint8_t bg_r;
    uint8_t bg_g;
    uint8_t bg_b;
    uint8_t ul_tag;
    uint8_t ul_palette;
    uint8_t ul_r;
    uint8_t ul_g;
    uint8_t ul_b;
    uint8_t underline;
    uint8_t bold;
    uint8_t italic;
    uint8_t faint;
    uint8_t blink;
    uint8_t inverse;
    uint8_t invisible;
    uint8_t strikethrough;
    uint8_t overline;
} GhosttyStyleFlat;

GHOSTTY_API int ghostty_wrapper_style_get(void* ref, void* out_style) {
    GhosttyStyle style = {0};
    style.size = sizeof(GhosttyStyle);
    
    GhosttyResult result = ghostty_grid_ref_style((GhosttyGridRef*)ref, &style);
    if (result != GHOSTTY_SUCCESS) return result;
    
    GhosttyStyleFlat* flat = (GhosttyStyleFlat*)out_style;
    
    flat->fg_tag = (uint8_t)style.fg_color.tag;
    flat->fg_palette = style.fg_color.value.palette;
    ghostty_color_rgb_get(style.fg_color.value.rgb, &flat->fg_r, &flat->fg_g, &flat->fg_b);
    
    flat->bg_tag = (uint8_t)style.bg_color.tag;
    flat->bg_palette = style.bg_color.value.palette;
    ghostty_color_rgb_get(style.bg_color.value.rgb, &flat->bg_r, &flat->bg_g, &flat->bg_b);
    
    flat->ul_tag = (uint8_t)style.underline_color.tag;
    flat->ul_palette = style.underline_color.value.palette;
    ghostty_color_rgb_get(style.underline_color.value.rgb, &flat->ul_r, &flat->ul_g, &flat->ul_b);
    
    flat->underline = (uint8_t)style.underline;
    flat->bold = style.bold ? 1 : 0;
    flat->italic = style.italic ? 1 : 0;
    flat->faint = style.faint ? 1 : 0;
    flat->blink = style.blink ? 1 : 0;
    flat->inverse = style.inverse ? 1 : 0;
    flat->invisible = style.invisible ? 1 : 0;
    flat->strikethrough = style.strikethrough ? 1 : 0;
    flat->overline = style.overline ? 1 : 0;
    
    return GHOSTTY_SUCCESS;
}
