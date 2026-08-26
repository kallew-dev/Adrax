use adb_client::{
    server::ADBServer,
    ADBDeviceExt,
}


fn main() -> adb_client::Result<()> {
    let mut server = ADBServer::default();

    let device = server::devices();

    println!("{device:#?}");

    Ok(())
}
