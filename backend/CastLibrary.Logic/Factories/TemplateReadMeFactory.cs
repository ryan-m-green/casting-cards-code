namespace CastLibrary.Logic.Factories
{
    public interface ITemplateReadMeFactory
    {
        string Create();
    }
    public class TemplateReadMeFactory : ITemplateReadMeFactory
    {
        public string Create()
        {
            return @"Cast LIBRARY — IMPORT PACKAGE README
                            =====================================

                            PACKAGE STRUCTURE
                            -----------------
                            library-import-template.zip
                            +-- library.json        ? All Cast, Location, and Sublocation data
                            +-- images/             ? Place image files here
                            ¦   +-- cast_aldric_vane.png
                            ¦   +-- location_ironhaven.png
                            ¦   +-- loc_rusty_flagon.png
                            +-- readme.txt          ? This file

                            HOW TO LINK IMAGES TO CARDS
                            ----------------------------
                            Each card object in library.json has an optional 'imageFileName' field.
                            Set this to the filename of the image you place in the images/ folder.

                            Example — Cast card in library.json:
                              {
                                'name': 'Aldric Vane',
                                'imageFileName': 'cast_aldric_vane.png'   <-- must match the image filename
                              }

                            The corresponding image file must be uploaded alongside the JSON bundle
                            when importing. Images can be JPG, PNG, or WebP, but will be converted to png.

                            If 'imageFileName' is null or omitted, the card is created without an image.
                            If an image file is named in the JSON but not included in the upload, the
                            card is still created the missing image is silently ignored.
                            If an image cannot be converted (corrupted file, unsupported format), the
                            card is still created and the failure is listed in the import summary.

                            DUPLICATE NAMES
                            ---------------
                            If a card name already exists in your library, the imported card will be
                            automatically renamed with a numeric suffix:
                              'Aldric Vane'   ?  already exists  ?  saved as 'Aldric Vane - 2'
                              'Aldric Vane'   ?  both exist      ?  saved as 'Aldric Vane - 3'

                            EXPORT FORMAT
                            -------------
                            The Export package produced by the DM Dashboard is identical to this
                            import format. You can export, edit library.json, and re-import.

                            IMAGE NAMING CONVENTIONS (recommended)
                            ----------------------------------------
                              Casts:      cast_<name>.png       e.g. cast_aldric_vane.png
                              locations:    location_<name>.png      e.g. location_ironhaven.png
                              Sublocations: loc_<name>.png       e.g. loc_rusty_flagon.png";
        }
    }
}
