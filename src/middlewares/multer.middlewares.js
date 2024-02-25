import multer from "multer"


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, ".public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname) //checl git documentation to use custom names on saving 
    }
  })
  
 export const upload = multer(
    { storage: storage }
    )


    //user uploaded files will be saved to public/temp