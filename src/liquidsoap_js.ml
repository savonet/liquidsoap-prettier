open Js_of_ocaml

let parse content =
  let content = Js.to_string content in
  let json =
    let buf = Buffer.create 0 in
    let formatter = Format.formatter_of_buffer buf in
    try Liquidsoap_tooling.Parsed_json.parse_string ~formatter content
    with _ ->
      Js_error.raise_
        (Js_error.of_error
           (new%js Js.error_constr (Js.string (Buffer.contents buf))))
  in
  Js._JSON##parse
    (Js.string (Liquidsoap_lang.Json.to_string ~compact:true json))

let _ =
  Js.export "lang"
    (object%js
       method parse = parse
    end)
