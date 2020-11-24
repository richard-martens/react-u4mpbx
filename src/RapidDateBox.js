import React from "react";
import FormGroup from "./FormGroup";

export default function DateBox(props) {
  return (
    <FormGroup
      forId={props.id}
      label={props.label}
      errors={props.errors}
      inline={props.inline}
    >
      <input
        id={props.id}
        name={props.id}
        type="date"
        className="form-control"
        onChange={props.onChange}
        value={props.value}
        required={props.required}
      />
    </FormGroup>
  );
}