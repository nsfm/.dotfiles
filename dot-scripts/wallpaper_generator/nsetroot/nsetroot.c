#include <X11/Xlib.h>
#include <X11/Xatom.h>
#include <X11/Xutil.h>

#include <Imlib2.h>

// I don't think I need this.
#include <X11/extensions/Xinerama.h>

// Need to clean these up.
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/**
 * My deep and sincere gratitude to Erlend Hamberg.
 * https://hamberg.no/erlend/posts/2011-01-06-read-current-x-background-to-jpeg.html
 */
Imlib_Image
loadCurrentWallpaper(Display* display, Window root, int width, int height)
{
  Pixmap currentRootPixmap;
  Atom act_type;
  int act_format;
  unsigned long nitems, bytes_after;
  unsigned char *data = NULL;
  Atom _XROOTPMAP_ID;

  _XROOTPMAP_ID = XInternAtom(display, "_XROOTPMAP_ID", False);

  bool gotWallpaper = False;
  if (XGetWindowProperty(display, root, _XROOTPMAP_ID, 0, 1, False,
        XA_PIXMAP, &act_type, &act_format, &nitems, &bytes_after,
        &data) == Success) {

    if (data) {
      currentRootPixmap = *((Pixmap *) data);
      XFree(data);
      gotWallpaper = True;
    }
  }

  fprintf(stderr, "b");
  if (!gotWallpaper) {
    fprintf(stderr, "Failed to read old wallpaper.");
    exit(4);
  }

  XImage* img = XGetImage(display, currentRootPixmap, 0, 0, width, height, ~0, ZPixmap);
  fprintf(stderr, "c");
  //XDestroyImage(img);
  //XFreePixmap(display, currentRootPixmap);
  fprintf(stderr, "d");
  return imlib_create_image_using_data(img->width, img->height, (DATA32*)img->data);
}

// Globals:
// TODO: Eliminate globals.
Display *display;
int screen;

// Adapted from fluxbox' bsetroot
int
setRootAtoms(Pixmap pixmap)
{
  Atom atom_root, atom_eroot, type;
  unsigned char *data_root, *data_eroot;
  int format;
  unsigned long length, after;

  atom_root = XInternAtom(display, "_XROOTMAP_ID", True);
  atom_eroot = XInternAtom(display, "ESETROOT_PMAP_ID", True);

  // doing this to clean up after old background
  if (atom_root != None && atom_eroot != None) {
    XGetWindowProperty(display, RootWindow(display, screen), atom_root, 0L, 1L, False, AnyPropertyType, &type, &format, &length, &after, &data_root);

    if (type == XA_PIXMAP) {
      XGetWindowProperty(display, RootWindow(display, screen), atom_eroot, 0L, 1L, False, AnyPropertyType, &type, &format, &length, &after, &data_eroot);

      if (data_root && data_eroot && type == XA_PIXMAP && *((Pixmap *) data_root) == *((Pixmap *) data_eroot))
        XKillClient(display, *((Pixmap *) data_root));
    }
  }

  atom_root = XInternAtom(display, "_XROOTPMAP_ID", False);
  atom_eroot = XInternAtom(display, "ESETROOT_PMAP_ID", False);

  if (atom_root == None || atom_eroot == None)
    return 0;

  // setting new background atoms
  XChangeProperty(display, RootWindow(display, screen), atom_root, XA_PIXMAP, 32, PropModeReplace, (unsigned char *) &pixmap, 1);
  XChangeProperty(display, RootWindow(display, screen), atom_eroot, XA_PIXMAP, 32, PropModeReplace, (unsigned char *) &pixmap, 1);

  return 1;
}

int
composite_image(Imlib_Image* buffer, int alpha, Imlib_Image rootimg, XineramaScreenInfo *outputs, int noutputs)
{
  int imgW, imgH, j;

  if (!buffer)
    return 0;

  imlib_context_set_image(buffer);
  imgW = imlib_image_get_width();
  imgH = imlib_image_get_height();

  if (alpha < 255) {
    // Create alpha-override mask
    imlib_image_set_has_alpha(1);
    Imlib_Color_Modifier modifier = imlib_create_color_modifier();
    imlib_context_set_color_modifier(modifier);

    DATA8 red[256], green[256], blue[256], alph[256];
    imlib_get_color_modifier_tables(red, green, blue, alph);
    for (j = 0; j < 256; j++)
      alph[j] = (DATA8) alpha;
    imlib_set_color_modifier_tables(red, green, blue, alph);

    imlib_apply_color_modifier();
    imlib_free_color_modifier();
  }

  imlib_context_set_image(rootimg);

  XineramaScreenInfo o = outputs[0];
  printf("size(%d, %d) pos(%d, %d)\n", o.width, o.height, o.x_org, o.y_org);
  int left = (o.width - imgW) / 2;
  int top = (o.height - imgH) / 2;
  imlib_blend_image_onto_image(buffer, 0, 0, 0, imgW, imgH, o.x_org + left, o.y_org + top, imgW, imgH);

  return 1;
}

int main(int argc, char **argv) {
  clock_t start, stop;
  Visual *vis;
  Colormap cm;
  Imlib_Image image;
  int width, height, depth, alpha;
  Pixmap pixmap;
  Imlib_Color_Modifier modifier = NULL;
  unsigned long screen_mask = ~0;
  int opt_root = true;

  /* global */ display = XOpenDisplay(NULL);

  if (!display) {
    fprintf(stderr, "Cannot open X display!\n");
    exit(123);
  }


  int noutputs = 0;
  XineramaScreenInfo *outputs = NULL;
  XineramaScreenInfo fake = {
    .x_org = 0,
    .y_org = 0,
    .width = 0,
    .height = 0,
  };

    noutputs = 1;
    outputs = &fake;

  Imlib_Context *context = imlib_context_new();
  imlib_context_push(context);

  imlib_context_set_display(display);
  vis = DefaultVisual(display, screen);
  cm = DefaultColormap(display, screen);
  width = DisplayWidth(display, screen);
  height = DisplayHeight(display, screen);
  depth = DefaultDepth(display, screen);

  fprintf(stderr, "a");
  // Fetch current wallpaper.
  Imlib_Image old_wallpaper = loadCurrentWallpaper(display, RootWindow(display, 0), width, height);

  Imlib_Image new_wallpaper = imlib_load_image(argv[1]);

  fprintf(stderr, "g");
  for (screen = 0; screen < ScreenCount(display); screen++) {
    if ((screen_mask & (1 << screen)) == 0)
      continue;

    outputs[0].width = width;
    outputs[0].height = height;

    pixmap = XCreatePixmap(display, RootWindow(display, screen), width, height, depth);

    imlib_context_set_visual(vis);
    imlib_context_set_colormap(cm);
    imlib_context_set_drawable(pixmap);
    imlib_context_set_color_range(imlib_create_color_range());

    image = imlib_create_image(width, height);
    imlib_context_set_image(image);

    imlib_context_set_color(0, 0, 0, 255);
    imlib_image_fill_rectangle(0, 0, width, height);

    imlib_context_set_dither(1);
    imlib_context_set_blend(1);

    // What are these color modifiers and which ones can I eliminate?
    if (modifier != NULL) {
      imlib_apply_color_modifier();
      imlib_free_color_modifier();
    }

    modifier = imlib_create_color_modifier();
    imlib_context_set_color_modifier(modifier);

    if (composite_image(old_wallpaper, 255, image, outputs, noutputs) == 0) {
      fprintf (stderr, "Bad image (%s)\n", "/tmp/test.png");
      exit(1);
    }

    // No point starting at 0.
    for (alpha = 1; alpha < 128; alpha++) {
      alpha++;
      start = clock();
      if (composite_image(new_wallpaper, alpha, image, outputs, noutputs) == 0) {
        fprintf (stderr, "Bad image (%s)\n", "/tmp/sc.png");
        exit(1);
      }

      // TODO How fast is this?
      //imlib_image_blur(5);
      //imlib_save_image("filename.png");

      if (modifier != NULL) {
        imlib_context_set_color_modifier(modifier);
        imlib_apply_color_modifier();
        imlib_free_color_modifier();
        modifier = NULL;
      }

      imlib_render_image_on_drawable(0, 0);


      if (setRootAtoms(pixmap) == 0)
        fprintf(stderr, "Couldn't create atoms...\n");

      XKillClient(display, AllTemporary);
      XSetCloseDownMode(display, RetainTemporary);

      XSetWindowBackgroundPixmap(display, RootWindow(display, screen), pixmap);
      XClearWindow(display, RootWindow(display, screen));

      XFlush(display);
      XSync(display, False);
      stop = clock();
      printf(" %f\n", ((float)stop-(float)start)/CLOCKS_PER_SEC * 1000.0);
    }

    imlib_free_image();
    imlib_free_color_range();
    imlib_context_pop();
    imlib_context_free(context);

    imlib_context_set_image(old_wallpaper);
    imlib_free_image();
    imlib_context_set_image(new_wallpaper);
    imlib_free_image();
  }

  if (outputs != NULL) {
    if (!opt_root) {
      XFree(outputs);
    }

    outputs = NULL;
    noutputs = 0;
  }

  return 0;
}
